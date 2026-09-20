#define main nfc_tests_main
#include "test_nfc_payload.c"
#undef main
#include <setjmp.h>
#include "mqtt_publisher.c"

static queued_command_t pending[8];
static int queued, consumed, replies;
static int subscribe_calls, subscribe_result=1, online_reports, offline_reports;
static bool servo_deferred;
bool servo_sg90_is_movement_deferred(void) { return servo_deferred; }
static char reply_text[400], published_topic[80], published_text[300];
static jmp_buf done;
QueueHandle_t xQueueCreate(unsigned count,unsigned size) { assert(size==sizeof(queued_command_t)); return pending; }
int xQueueSend(QueueHandle_t q,const void *msg,unsigned timeout) { if(queued==8)return 0; memcpy(&pending[queued++],msg,sizeof(queued_command_t));return 1; }
int xQueueReceive(QueueHandle_t q,void *msg,unsigned timeout) { if(consumed==queued)longjmp(done,1); memcpy(msg,&pending[consumed++],sizeof(queued_command_t));return 1; }
void vQueueDelete(QueueHandle_t q) {}
int xTaskCreate(void (*fn)(void*),const char *name,unsigned stack,void *arg,int priority,TaskHandle_t *task) { return pdPASS; }
esp_mqtt_client_handle_t esp_mqtt_client_init(const esp_mqtt_client_config_t *config) { return pending; }
int esp_mqtt_client_register_event(esp_mqtt_client_handle_t c,int id,void (*fn)(void*,esp_event_base_t,int,void*),void *arg) { return ESP_OK; }
int esp_mqtt_client_start(esp_mqtt_client_handle_t c) { return ESP_OK; }
int esp_mqtt_client_destroy(esp_mqtt_client_handle_t c) { return ESP_OK; }
int esp_mqtt_client_subscribe(esp_mqtt_client_handle_t c,const char *topic,int qos) { assert(!strcmp(topic,"gate/AA:BB:CC:DD:EE:FF/command") && qos==1);subscribe_calls++;return subscribe_result; }
int esp_mqtt_client_publish(esp_mqtt_client_handle_t c,const char *topic,const char *data,int len,int qos,int retain) { strcpy(published_topic,topic);strcpy(published_text,data);return 1; }
int esp_mqtt_client_enqueue(esp_mqtt_client_handle_t c,const char *topic,const char *data,int len,int qos,int retain,bool store) {
 if (!strcmp(topic,"gate/AA:BB:CC:DD:EE:FF/connection")) { assert(qos==1 && retain); if(strstr(data,"true"))online_reports++; else {assert(strstr(data,"false"));offline_reports++;} return 1; }
 assert(!strcmp(topic,"gate/AA:BB:CC:DD:EE:FF/result") && qos==1 && !retain);strcpy(reply_text,data);replies++;return 1;
}
const char *esp_err_to_name(esp_err_t error) { return error==ESP_OK?"ESP_OK":"ESP_ERR_INVALID_ARG"; }
const char *device_identity_get_id(void) { return "AA:BB:CC:DD:EE:FF"; }
void device_identity_copy_mac_colon(char *buffer,size_t size) { snprintf(buffer,size,"%s",device_identity_get_id()); }
void climate_stats_get_snapshot(climate_stats_snapshot_t *out) { memset(out,0,sizeof(*out)); }
void climate_stats_mark_samples_sent(uint8_t bit) {}
void passage_stats_get_snapshot(passage_stats_snapshot_t *out) { memset(out,0,sizeof(*out)); }
void passage_stats_mark_closed_buckets_sent(uint8_t bit) {}

int main(void) {
 assert(nfc_payload_init()==ESP_OK);
 assert(mqtt_publisher_init()==ESP_OK);
 subscribe_result=-1;
 mqtt_event_handler(NULL,NULL,MQTT_EVENT_CONNECTED,NULL);
 assert(online_reports==0 && offline_reports==1 && subscribe_calls==1);
 subscribe_result=1;
 assert(mqtt_publisher_publish_connection()==ESP_ERR_INVALID_STATE);
 assert(subscribe_calls==2 && online_reports==0);
 const char denied=(char)0x80, granted=1;
 esp_mqtt_event_t ack={.data=&denied,.data_len=1};
 mqtt_event_handler(NULL,NULL,MQTT_EVENT_SUBSCRIBED,&ack);
 assert(!s_command_ready && online_reports==0);
 mqtt_publisher_publish_connection(); assert(subscribe_calls==3);
 ack.data=&granted;mqtt_event_handler(NULL,NULL,MQTT_EVENT_SUBSCRIBED,&ack);
 assert(s_command_ready && online_reports==1);
 const char *json="{\"commandId\":\"cmd-1\",\"gateId\":\"AA:BB:CC:DD:EE:FF\",\"cardType\":\"OPEN_NOW\"}";
 esp_mqtt_event_t e={.topic=s_command_topic,.topic_len=(int)strlen(s_command_topic),.total_data_len=(int)strlen(json),.data=json,.data_len=20};
 receive_command(&e); assert(queued==0);
 e.current_data_offset=20;e.data=json+20;e.data_len=(int)strlen(json)-20;e.topic=NULL;e.topic_len=0;
 receive_command(&e);assert(queued==1);
 // Duplicate QoS delivery must resend result but must not reapply the rule.
 e.current_data_offset=0;e.topic=s_command_topic;e.topic_len=(int)strlen(s_command_topic);e.data=json;e.data_len=(int)strlen(json);
 receive_command(&e);assert(queued==2);
 int before=schedule_calls;
 if(!setjmp(done))command_task(NULL);
 assert(replies==2 && schedule_calls==before+1 && gates==3 && strstr(reply_text,"\"status\":\"OK\""));
 queued=consumed=0;servo_deferred=true;
 receive_command(&e);
 if(!setjmp(done))command_task(NULL);
 assert(strstr(reply_text,"SERVO_DEFERRED") && strstr(reply_text,"\"status\":\"OK\""));
 servo_deferred=false;
 queued=consumed=0;e.retain=true;receive_command(&e);assert(queued==0);
 e.retain=false;e.topic="wrong";e.topic_len=5;receive_command(&e);assert(queued==0);
 e.topic=s_command_topic;e.topic_len=(int)strlen(s_command_topic);e.data_len=20;receive_command(&e);
 e.current_data_offset=21;e.data=json+21;e.data_len=(int)strlen(json)-21;receive_command(&e);assert(queued==0);
 assert(mqtt_publisher_publish_sensor_blocked("entrance",1,60,true)==ESP_OK);
 assert(!strcmp(published_topic,"gate/AA:BB:CC:DD:EE:FF/tunnel-alert"));
 assert(strstr(published_text,"\"blockedSeconds\":60") && !strstr(published_text,"+09:00"));
 mqtt_event_handler(NULL,NULL,MQTT_EVENT_DISCONNECTED,NULL);
 assert(!s_command_ready && !mqtt_publisher_is_connected());
 puts("MQTT transport host tests passed: SUBACK gating and retry, chunks, duplicate execution, topic, retained rejection, alert contract");
 return 0;
}
