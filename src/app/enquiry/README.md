# The `src/app/enquiry` Directory

## Overview

```
src/
  |- app/
  |  |- enquiry/
  |  |  |- less/
  |  |  |  |- enquiry.less
  |  |  |  |- variables.less
  |  |  |- templates/
  |  |  |  |- enquiry.tpl.html
  |  |  |- enquiry.js
```

- `nequiry.js` - defines the module.
- `nequiry/less` - module-specific styles; these files are rolled into a
  `[root]/temp/imports.less` by the build process and immediately compiled to
  `build/assets/OrderCloud-X.X.X.css`.
- `nequiry/templates/` - contains all the templates for the module.

## `enquiry.js`

This component supports the alternate order process where the user cannot
find a desired component and must submit an enquiry to resolve
