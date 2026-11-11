# Security Policy

## Supported versions

The latest release of Whiteboard is supported. Older versions are only supported
while the fix can be backported without breaking changes.

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |

## Reporting a vulnerability

Please do **not** report security vulnerabilities through the public GitHub
issue tracker.

Report them via GitHub's private vulnerability reporting instead:
[Report a vulnerability](https://github.com/cracker0dks/whiteboard/security/advisories/new)

or by email to the repository maintainer (`cracker0dks` on GitHub).

You should receive a response within 72 hours. If the issue is confirmed, a
patched release and a GitHub security advisory will be published.

## Dependency management

Dependencies are checked with `npm audit` and Dependabot. Fixed versions are
applied through Dependabot PRs or, where a direct version bump is not possible,
via pinned `overrides` in `package.json`.

## Accepted risks

Two advisories remain in `npm audit` and cannot be fixed with a version bump:

| Package   | Advisory                                                                                                                                           | Why it is accepted                                                                                                                                                                                                                                                       |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| bootstrap | [GHSA-vxmc-5x29-h64v](https://github.com/advisories/GHSA-vxmc-5x29-h64v), [GHSA-q58r-hwc8-rm9j](https://github.com/advisories/GHSA-q58r-hwc8-rm9j) | No patched Bootstrap 3.x release exists (3.4.1 is the last). It is only shipped inside the generated API docs (apidoc), whose content comes from this repository's own source comments, not from user input. Upgrading to Bootstrap 4/5 would break the apidoc template. |
| deepmerge | [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)                                                                           | No patched release exists upstream. It is a development-only dependency used by jest to merge this project's own jest configuration (trusted input).                                                                                                                     |
