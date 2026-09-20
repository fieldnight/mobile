#pragma once
#define ESP_RETURN_ON_ERROR(call, tag, format, ...) do { esp_err_t e = (call); if (e != ESP_OK) return e; } while (0)
