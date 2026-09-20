#pragma once
#include <stddef.h>
typedef void *QueueHandle_t;
QueueHandle_t xQueueCreate(unsigned count, unsigned size);
int xQueueReceive(QueueHandle_t queue, void *message, unsigned timeout);
int xQueueSend(QueueHandle_t queue, const void *message, unsigned timeout);
void vQueueDelete(QueueHandle_t queue);
