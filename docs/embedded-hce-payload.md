# WeBee HCE Payload for ESP32

## NFC Response Format

Android HCE returns a UTF-8 string when ESP32 sends SELECT AID.

```text
WBEE|{title}|{mode}|{start}|{end}|{repeatFlag}
```

Separator is `|`. The app replaces `|` inside `title` with a blank space before sending.

## Fields

| Index | Field | Example | Description |
| --- | --- | --- | --- |
| 0 | prefix | `WBEE` | Payload identifier |
| 1 | title | `오전개방` | NFC card title |
| 2 | mode | `window` | Door operation mode |
| 3 | start | `09:00` | Start value. Meaning depends on `mode` |
| 4 | end | `14:00` | End value. Can be empty depending on `mode` |
| 5 | repeatFlag | `0` or `1` | `1` means repeat, `0` means single |

## Mode and Repeat Rules

Some modes already imply whether the action is single or repeating. ESP32 should prioritize `mode` for those cases.

| mode | Meaning | Repeat rule | start | end |
| --- | --- | --- | --- | --- |
| `lock_days` | Lock for N days | Always single. Ignore `repeatFlag` | Day count, e.g. `3` | Empty |
| `alternate_days` | Alternate-day operation | Always repeat. Ignore `repeatFlag` | `close_first` etc. | Empty |
| `window` | Time-window operation | Use `repeatFlag` | `HH:mm` | `HH:mm` |
| `open_now` | ON command | Use `repeatFlag` | Usually empty | Empty |
| `close_now` | OFF command | Use `repeatFlag` | Empty | Usually empty |

In short:

```text
lock_days       -> single by mode
alternate_days  -> repeat by mode
window          -> read repeatFlag
open_now        -> read repeatFlag
close_now       -> read repeatFlag
```

## ESP32 Parsing Recommendation

```c
bool hasRepeatFlag = partsCount >= 6;
bool repeat = false;

if (strcmp(mode, "alternate_days") == 0) {
  repeat = true;
} else if (strcmp(mode, "lock_days") == 0) {
  repeat = false;
} else if (hasRepeatFlag) {
  repeat = strcmp(parts[5], "1") == 0;
} else {
  repeat = false;
}
```

For backward compatibility, old payloads may have only 5 fields:

```text
WBEE|title|mode|start|end
```

If `repeatFlag` is missing, treat only `alternate_days` as repeat and all other modes as single.

## Examples

Single ON:

```text
WBEE|ON|open_now|||0
```

Repeating ON:

```text
WBEE|ON반복|open_now|||1
```

Single time-window operation:

```text
WBEE|오전개방|window|09:00|14:00|0
```

Repeating time-window operation:

```text
WBEE|오전개방반복|window|09:00|14:00|1
```

Alternate-day operation, always repeat by mode:

```text
WBEE|격일운영|alternate_days|close_first||1
```

Lock for 3 days after pesticide work, always single by mode:

```text
WBEE|농약방제|lock_days|3||0
```
