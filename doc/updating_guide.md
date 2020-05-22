# Updating guide

## From v1.x to 2.x (or latest)

Configuration handling has been updated: the ability to change settings from the CLI or the environment has been removed.

**Configuration is now handled with a yml config file**, which can be overridden with the `--config` CLI argument.

Here is the mapping from old cli argument / env variables to the new config file object:

- accesstoken => `backend.accessToken`
- webdav => `backend.enableWebdav`
- disablesmallestscreen => `frontend.showSmallestScreenIndicator`
