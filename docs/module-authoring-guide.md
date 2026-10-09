# Module Authoring Guide

## Choose a page type

Use the generic `ModuleShell` for the standard parameter-and-results page. A module only needs a manifest and model; do not add a custom `View.tsx` unless its interaction or visualization needs a different presentation.

Add a custom view when the module needs a specialized interface, such as an interactive scene. A custom view receives `inputs`, `onChange`, and `results`, and should use `ModulePageFrame` for its page frame and manifest header.

## Shared layout

`ModulePageFrame` is the shared layout contract for module pages:

- The page content uses a centered frame capped at 1200px with standard horizontal padding.
- The title, divider, and module badges span the frame width and align with the body content.
- The summary remains capped at 780px for readable line lengths.
- Keep body content within the frame. Constrain prose-heavy sections to about 780px and center them; visualizations may use the available frame width.

Do not recreate the outer frame or module header in a custom view. Put only module-specific content inside `ModulePageFrame` so its spacing and alignment remain consistent.

## Starter files

The `_template` directory is excluded from the module registry. Use its manifest, model, and equation files as starting points. Copy `_template/View.tsx` only when choosing a custom view; standard modules should omit it and use `ModuleShell`. Replace the example manifest values before registering a new module.
