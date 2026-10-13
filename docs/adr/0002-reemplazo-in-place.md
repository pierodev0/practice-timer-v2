# In-place replacement, no parallel app

The port lands view by view on `react-port/architecture`, deleting the Vue code each view replaces. No parallel React app, no compatibility layers: a single deployable and a single domain model at all times, per the repo's no-backwards-compatibility rule.

## Consequences

Intermediate branch states mix Vue and React shells, so ticket slicing must keep the app bootable after every slice.
