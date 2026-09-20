#pragma once
/* Host transport tests never connect to a real broker. */
#define APP_MQTT_BROKER_URI "mqtt://test.invalid"
#define APP_MQTT_USERNAME "test"
#define APP_MQTT_PASSWORD "test"
