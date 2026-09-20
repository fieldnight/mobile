#pragma once
typedef void *TaskHandle_t;
#define pdPASS 1
#define portMAX_DELAY 0xffffffff
int xTaskCreate(void (*fn)(void*), const char *name, unsigned stack, void *arg, int priority, TaskHandle_t *task);
