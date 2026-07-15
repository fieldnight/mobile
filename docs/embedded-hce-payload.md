# WeBee HCE Payload for ESP32

Android HCE returns one UTF-8 payload when the ESP32 selects the WeBee AID.

```text
WBEE|{shortTitle}|{mode}|{start}|{end}|{repeatFlag}|{phoneTime}
```

`repeatFlag` is `1` for a repeating routine and `0` for one execution.
`phoneTime` is the phone's current `HH:mm` and is included only for
`open_at`, `close_at`, and `window`. The HCE service creates it when the
reader requests the payload, not when the user opens the card screen.

The wire title is shortened to four characters so the response fits in the
RC522 FIFO. The full title remains in the app and AsyncStorage.

| mode | start | end | repeat |
| --- | --- | --- | --- |
| `open_now` | empty | empty | ignored |
| `close_now` | empty | empty | ignored |
| `open_at` | `HH:mm` | empty | once or daily |
| `close_at` | empty | `HH:mm` | once or daily |
| `window` | open `HH:mm` | close `HH:mm` | once or daily |
| `alternate_24h` | `close_first` | empty | one 48-hour sequence or continuous |
| `lock_days` | number of days | empty | ignored |

Examples:

```text
WBEE|ON|open_now|||0|
WBEE|열기|open_at|09:00||0|08:42
WBEE|닫기|close_at||18:00|1|08:42
WBEE|오전|window|09:00|14:00|1|08:42
WBEE|격일|alternate_24h|close_first||1|
WBEE|방제|lock_days|3||0|
```
