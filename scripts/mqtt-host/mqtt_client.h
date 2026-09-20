#pragma once
#include <stdbool.h>
#include "esp_err.h"
#define ESP_FAIL -1
#define ESP_EVENT_ANY_ID -1
typedef void *esp_event_base_t;
typedef void *esp_mqtt_client_handle_t;
typedef enum {MQTT_EVENT_CONNECTED, MQTT_EVENT_DISCONNECTED, MQTT_EVENT_ERROR, MQTT_EVENT_DATA, MQTT_EVENT_SUBSCRIBED} esp_mqtt_event_id_t;
typedef struct { int current_data_offset, total_data_len, data_len, topic_len; bool retain; const char *topic; const char *data; } esp_mqtt_event_t;
typedef esp_mqtt_event_t *esp_mqtt_event_handle_t;
typedef struct {
 struct { struct {const char *uri;} address; } broker;
 struct {const char *username; struct {const char *password;} authentication; const char *client_id;} credentials;
 struct { struct { const char *topic, *msg; int msg_len, qos; bool retain; } last_will; } session;
} esp_mqtt_client_config_t;
esp_mqtt_client_handle_t esp_mqtt_client_init(const esp_mqtt_client_config_t *config);
int esp_mqtt_client_register_event(esp_mqtt_client_handle_t client,int id,void (*fn)(void*,esp_event_base_t,int,void*),void *arg);
int esp_mqtt_client_start(esp_mqtt_client_handle_t client);
int esp_mqtt_client_destroy(esp_mqtt_client_handle_t client);
int esp_mqtt_client_subscribe(esp_mqtt_client_handle_t client,const char *topic,int qos);
int esp_mqtt_client_publish(esp_mqtt_client_handle_t client,const char *topic,const char *data,int len,int qos,int retain);
int esp_mqtt_client_enqueue(esp_mqtt_client_handle_t client,const char *topic,const char *data,int len,int qos,int retain,bool store);
const char *esp_err_to_name(esp_err_t error);
