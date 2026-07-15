# ember-resource-scheduler

Ember addon providing two FullCalendar-style resource-scheduling views:

- **resource-timeline** — horizontal time axis, resources as rows (multi-lane), for
  day-granularity scheduling (e.g. room/bed bookings).
- **vertical-resource-grid** — vertical time-of-day axis, resources as columns (multi-lane),
  for minute-granularity scheduling (e.g. procedure/appointment slots).

Both support full drag-and-drop (create, move, resize). The addon is strictly presentational
and persistence-agnostic — it knows nothing about your data layer and talks only in plain-object
contracts (`Resource`, `Block`, `GestureResult`).

## Compatibility

- Ember.js v4.12 or above
- Embroider or ember-auto-import v2

## Installation

```
ember install ember-resource-scheduler
```

## Usage

See [`test-app/`](test-app) for worked examples of both views wired to plain-object data,
and the component-level tests there for the full `Resource` / `Block` / `GestureResult` contracts.

## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.

## License

This project is licensed under the [MIT License](LICENSE.md).
