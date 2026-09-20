/* Host-only tests: real NFC parser/rule code, mocked RTC, servo and FreeRTOS. */
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include "nfc_payload.h"
#include "passage_monitor.h"
#include "schedule.h"
#include "freertos/semphr.h"

static rtc_datetime_t clock_value = {2026, 9, 14, 10, 0, 0}; /* Monday */
static passage_monitor_status_t counts;
static int gates, clock_error, mutex_held, schedule_calls, captured_end_hour, captured_end_minute;
static bool captured_repeat, captured_close_first;
SemaphoreHandle_t xSemaphoreCreateMutex(void) { return &mutex_held; }
int xSemaphoreTake(SemaphoreHandle_t lock, int timeout) { (void)lock; (void)timeout; assert(!mutex_held); mutex_held = 1; return 1; }
void xSemaphoreGive(SemaphoreHandle_t lock) { (void)lock; assert(mutex_held); mutex_held = 0; }
esp_err_t rtc_ds3231_get_time(rtc_datetime_t *out) { *out = clock_value; return clock_error; }
bool rtc_datetime_is_valid(const rtc_datetime_t *now) { return now && now->year >= 2000 && now->month >= 1 && now->month <= 12 && now->day >= 1 && now->day <= 31 && now->hour < 24; }
void passage_monitor_get_status(passage_monitor_status_t *out) { *out = counts; }
esp_err_t servo_sg90_open(void) { gates = 3; return ESP_OK; }
esp_err_t servo_sg90_close(void) { gates = 0; return ESP_OK; }
esp_err_t servo_sg90_close_entrance(void) { gates = 2; return ESP_OK; }
esp_err_t servo_sg90_close_exit(void) { gates = 1; return ESP_OK; }
void schedule_disable(void) { schedule_calls++; }
esp_err_t schedule_set_at(const rtc_datetime_t *now, int hour, int minute, schedule_action_t action, bool repeat) {
  (void)now; (void)action; captured_end_hour = hour; captured_end_minute = minute; captured_repeat = repeat; return ESP_OK;
}
esp_err_t schedule_set_window(const rtc_datetime_t *now, int oh, int om, int ch, int cm, bool repeat) {
  (void)now; (void)oh; (void)om; captured_end_hour = ch; captured_end_minute = cm; captured_repeat = repeat; return ESP_OK;
}
bool schedule_get_recovery_action(const rtc_datetime_t *now, schedule_action_t *out) { (void)now; *out = SCHEDULE_ACTION_OPEN; return true; }
esp_err_t schedule_set_alternate_24h(const rtc_datetime_t *now, bool close_first, bool repeat) {
  (void)now; captured_close_first = close_first; captured_repeat = repeat; return ESP_OK;
}
esp_err_t schedule_set_lock_days(const rtc_datetime_t *now, int days) { (void)now; assert(days == 3); return ESP_OK; }

static nfc_payload_t parse(const char *wire) {
  nfc_payload_t card; assert(nfc_payload_parse(wire, &card) == ESP_OK); return card;
}
static void apply(const char *wire) {
  nfc_payload_t card = parse(wire); assert(nfc_payload_apply(&card) == ESP_OK);
}
static void tick(void) { assert(nfc_payload_apply_active_count_rule() == ESP_OK); }

int main(void) {
  _putenv_s("TZ", "UTC"); _tzset();
  assert(nfc_payload_init() == ESP_OK);
  nfc_payload_t c = parse("WB2|C|3|12|42|0|1440|3|1");
  assert(c.mode == NFC_PAYLOAD_MODE_COUNT_CONTROL && c.count_low == 3 && c.count_high == 12);
  assert(c.count_days == 42 && c.count_start == 0 && c.count_end == 1440 && c.count_within == 3 && c.count_above == 1);
  assert(strcmp(nfc_payload_mode_name(c.mode), "count_control") == 0);

  const char *bad[] = {"WB2", "WB2|", "WB2|C|3|12|42|0|1440|3", "WB2|O|1", "WB2|A|1440|0",
    "WB2|Z|1441|0", "WB2|W|0|1440|2", "WB2|T|2|0", "WB2|L|0", "WB2|L|366", "WB2|Q",
    "WB2|C|0|100|0|0|1440|3|1", "WB2|C|13|12|0|0|1440|3|1", "WB2|C|-1|12|0|0|1440|3|1",
    "WB2|C|0|99|128|0|1440|3|1", "WB2|C|0|99|0|1|1440|3|1", "WB2|C|0|99|0|0|1440|4|1",
    "WB2|C|0|99|0|0|1440|3|1|0", "WB2|C|0|99|0|0|0|3|1", "WB2|A|999999999999999999999999|1"};
  for (size_t i = 0; i < sizeof(bad)/sizeof(bad[0]); ++i) assert(nfc_payload_parse(bad[i], &c) != ESP_OK);

  apply("WB2|A|540|0"); assert(captured_end_hour == 9 && captured_end_minute == 0 && !captured_repeat);
  apply("WB2|Z|1440|1"); assert(captured_end_hour == 0 && captured_repeat);
  apply("WB2|W|1380|1440|1"); assert(captured_end_hour == 0 && captured_end_minute == 0 && captured_repeat);
  apply("WB2|T|0|1"); assert(captured_close_first && captured_repeat && gates == 0);
  apply("WB2|T|1|0"); assert(!captured_close_first && !captured_repeat && gates == 3);
  apply("WB2|L|3"); assert(gates == 0);
  apply("WBEE|old|open_now|||0|"); assert(gates == 3);

  // Negative active count must not wrap to an unsigned high value.
  counts.entrance_in_count = 10; counts.exit_out_count = 9;
  apply("WB2|C|3|12|42|540|840|3|1"); assert(gates == 2);
  counts.exit_out_count = 13; tick(); assert(gates == 3); // low inclusive
  counts.exit_out_count = 21; tick(); assert(gates == 3);
  counts.exit_out_count = 22; tick(); assert(gates == 1); // high inclusive in above
  int before = schedule_calls; apply("WB2|S"); assert(schedule_calls == before && gates == 1);
  clock_value.hour = 14; tick(); assert(gates == 3); // no passage event needed
  clock_value.day = 15; clock_value.hour = 10; tick(); assert(gates == 3); // Tuesday excluded
  clock_value.day = 16; tick(); assert(gates == 1); // Wednesday resumes

  // All four independent entrance/exit states; 99 is a literal threshold.
  for (int bits = 0; bits < 4; ++bits) {
    char wire[49]; snprintf(wire, sizeof(wire), "WB2|C|0|99|127|0|1440|3|%d", bits);
    counts.entrance_in_count = 0; counts.exit_out_count = 99; apply(wire); assert(gates == bits);
  }
  apply("WB2|C|99|99|127|0|1440|3|1"); assert(gates == 1);

  // One-shot expires once; changing day cannot reactivate it.
  clock_value.day = 14; clock_value.hour = 10;
  apply("WB2|C|3|12|0|540|840|3|1"); assert(gates == 1);
  clock_value.hour = 14; tick(); assert(gates == 3);
  clock_value.day = 15; clock_value.hour = 10; gates = 0; tick(); assert(gates == 0);
  // Applying after the window selects the next occurrence, before start stays open.
  clock_value.day = 14; clock_value.hour = 15;
  apply("WB2|C|3|12|0|540|840|3|1"); assert(gates == 3);
  clock_value.day = 15; clock_value.hour = 8; tick(); assert(gates == 3);
  clock_value.hour = 9; tick(); assert(gates == 1);
  // Full day ends at midnight, including month rollover.
  clock_value = (rtc_datetime_t){2026, 9, 30, 23, 59, 59};
  apply("WB2|C|3|12|0|0|1440|3|1"); assert(gates == 1);
  clock_value = (rtc_datetime_t){2026, 10, 1, 0, 0, 0}; tick(); assert(gates == 3);

  // Replacement and an invalid RTC must not resurrect/discard the previous rule.
  apply("WB2|C|3|12|127|0|1440|3|1"); assert(gates == 1);
  before = schedule_calls; clock_error = ESP_ERR_INVALID_STATE;
  c = parse("WB2|C|3|12|0|540|840|3|1"); assert(nfc_payload_apply(&c) != ESP_OK);
  assert(schedule_calls == before); clock_error = 0; tick(); assert(gates == 1);
  apply("WB2|O"); assert(gates == 3); counts.exit_out_count = 0; tick(); assert(gates == 3);
  apply("WB2|F"); assert(gates == 0); tick(); assert(gates == 0);
  puts("NFC firmware host tests passed: parsing, boundaries, gates, weekdays, expiry, replacement");
  return 0;
}
