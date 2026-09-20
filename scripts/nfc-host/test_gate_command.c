#define main nfc_tests_main
#include "test_nfc_payload.c"
#undef main
#include "gate_command.h"
#include "cJSON.h"

static esp_err_t parse_json(const char *json, nfc_payload_t *p) {
    char id[GATE_COMMAND_ID_SIZE];
    gate_command_t command;
    esp_err_t err = gate_command_parse(json, "AA:BB:CC:DD:EE:FF", id, &command);
    if (err == ESP_OK) *p = command.payload;
    return err;
}
int main(void) {
    nfc_tests_main();
    nfc_payload_t p;
    const char *prefix = "{\"commandId\":\"cmd-123\",\"gateId\":\"AA:BB:CC:DD:EE:FF\",\"cardType\":";
    char json[1536];
    const char *types[] = {"OPEN_NOW", "CLOSE_NOW", "COUNT_STATUS"};
    const int modes[] = {NFC_PAYLOAD_MODE_OPEN_NOW, NFC_PAYLOAD_MODE_CLOSE_NOW, NFC_PAYLOAD_MODE_COUNT_STATUS};
    for (int i=0;i<3;i++) {
        snprintf(json,sizeof(json),"%s\"%s\"}",prefix,types[i]);
        assert(parse_json(json,&p)==ESP_OK && p.mode==modes[i]);
    }
    snprintf(json,sizeof(json),"%s\"WINDOW\",\"payload\":{\"start\":\"09:30\",\"end\":\"24:00\",\"repeat\":true}}",prefix);
    assert(parse_json(json,&p)==ESP_OK && p.start_minute==30 && p.end_hour==0 && p.repeat);
    snprintf(json,sizeof(json),"%s\"COUNT_CONTROL\",\"payload\":{\"days\":[\"mon\",\"wed\",\"fri\"],\"countRange\":{\"low\":0,\"high\":99},\"timeWindow\":{\"start\":\"00:00\",\"end\":\"24:00\"},\"rules\":{\"within\":{\"entranceOpen\":true,\"exitOpen\":true},\"above\":{\"entranceOpen\":true,\"exitOpen\":false}}}}",prefix);
    assert(parse_json(json,&p)==ESP_OK && p.count_days==42 && p.count_high==99 && p.count_end==1440 && p.count_above==1);
    cJSON *root=cJSON_Parse(json), *payload=cJSON_GetObjectItem(root,"payload"), *range=cJSON_GetObjectItem(payload,"countRange");
    cJSON_ReplaceItemInObject(range,"high",cJSON_CreateNumber(100));
    char *bad=cJSON_PrintUnformatted(root); assert(parse_json(bad,&p)!=ESP_OK); cJSON_free(bad);
    cJSON_ReplaceItemInObject(range,"high",cJSON_CreateNumber(0));
    bad=cJSON_PrintUnformatted(root); assert(parse_json(bad,&p)==ESP_OK && p.count_low==0 && p.count_high==0); cJSON_free(bad);
    cJSON_AddStringToObject(root,"operation","CANCEL");
    bad=cJSON_PrintUnformatted(root); assert(parse_json(bad,&p)!=ESP_OK); cJSON_free(bad); cJSON_Delete(root);
    const char *invalid[]={"{}", "{bad", "{\"commandId\":\"x\",\"gateId\":\"wrong\",\"cardType\":\"OPEN_NOW\"}", "{\"commandId\":\"x\",\"gateId\":\"AA:BB:CC:DD:EE:FF\",\"cardType\":\"OPEN_NOW\"}garbage"};
    for(size_t i=0;i<sizeof(invalid)/sizeof(invalid[0]);i++) assert(parse_json(invalid[i],&p)!=ESP_OK);
    char id[GATE_COMMAND_ID_SIZE]; gate_command_t command;
    assert(gate_command_parse("{\"commandId\":\"cancel-1\",\"gateId\":\"AA:BB:CC:DD:EE:FF\",\"operation\":\"CANCEL\",\"targetCommandId\":\"rule-1\"}", "AA:BB:CC:DD:EE:FF", id, &command) == ESP_OK);
    assert(command.operation == GATE_COMMAND_OP_CANCEL && !strcmp(command.target_command_id, "rule-1"));
    p = parse("WB2|A|540|1");
    assert(nfc_payload_apply_online(&p, "rule-1") == ESP_OK);
    nfc_payload_t status = parse("WB2|S");
    assert(nfc_payload_apply_online(&status, "query-1") == ESP_OK);
    assert(nfc_payload_cancel_online("rule-1") == ESP_OK);
    assert(nfc_payload_cancel_online("rule-1") == ESP_ERR_NOT_FOUND);
    assert(nfc_payload_apply_online(&p, "rule-2") == ESP_OK);
    apply("WB2|A|600|1"); /* NFC replaces online ownership. */
    assert(nfc_payload_cancel_online("rule-2") == ESP_ERR_NOT_FOUND);
    puts("Gate MQTT JSON contract tests passed: execute, cancel, query preserves owner, NFC replacement");
    return 0;
}
