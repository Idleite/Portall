# <a href="https://github.com/need4swede/portall/releases/tag/v1.0.6" target="_blank">v1.0.6</a>
## Added:
### Port Protocols
Portall now supports setting different protocols for ports (TCP/UDP).

You can choose protocols when generating new ports (default is TCP), when creating new ones, and when editing existing ones. Two identical port numbers can both be registered to a single IP if they have different protocols. If you try to add an entry that already has a matching port and protocol, it will trigger the Port Conflict Resolver.

If you add ports from an import, such as a Caddyfile or Docker-Compose, that doesn't explicitly state what protocols are being used, it will default to TCP.
### Loading Animation
Certain actions, like port conflict resolutions and moving IP panels, now trigger a loading animation that prevents further action until the changes have registered.
## Changed:
### Database
**Breaking Changes!** Database changes required for new port protocol feature.
### Docker-Compose Imports
Now supports `/tcp` and `/udp` properties to differentiate between the two protocols.
## Fixed:
### <a href="https://github.com/need4swede/Portall/issues/10" target="_blank">Settings Reset</a>
Fixed an issue where certain settings would reset if you made changes in the settings.

# <a href="https://github.com/need4swede/portall/releases/tag/v1.0.5" target="_blank">v1.0.5</a>
## Added:
### <a href="https://github.com/need4swede/Portall/issues/7" target="_blank">Data Export</a>
You can now export your entries to a JSON file.
## Changed:
### JSON Import
Updated the format of JSON imports to match the new export,
## Fixed:
### <a href="https://github.com/need4swede/Portall/issues/14" target="_blank">Newly Added Port Order</a>
Fixed an issue where newly added ports would get placed near the beggining of the stack. Now they get appended to the end,

# <a href="https://github.com/need4swede/portall/releases/tag/v1.0.4" target="_blank">v1.0.4</a>
## Added:
### Port Conflict Resolution
In the event of moving a port to a different IP panel where the port is already registered, a new conflict resolution modal will present users with three options to choose from:

- Change the number of the migrating port
- Change the number of the existing port
- Cancel the action

This will prevent port conflicts when moving between hosts and give users an intuative way to migrate their ports and services over between IP's.
## Changed:
### Codebase Cleanup
Refactored files and much of the code to make the applicaiton more modular.
## Fixed:
### Port Positioning
Fixed a bug that would reset a port's position within an IP panel.
### Can't edit last port
Fixed a bug that prevented users from editing the only remaining port in an IP panel.

# <a href="https://github.com/need4swede/portall/releases/tag/v1.0.3" target="_blank">v1.0.3</a>
## Changed:
### Unique Port Numbers
Port numbers now have to be unique within an IP panel. You cannot add a service using an already registered port number, nor can you change a port to a number that is already registered.
## Fixed:
### <a href="https://github.com/need4swede/Portall/issues/8" target="_blank">Port ID Bug</a>
Fixed an issue where the ID of a port wasn't being read correctly.

<hr>
# <a href="https://github.com/need4swede/portall/releases/tag/v1.0.2" target="_blank">v1.0.2</a>
## Changed:
**Breaking Change!** - Altered database structure to handle new ordering logic.
## Fixed:
### <a href="https://github.com/need4swede/Portall/issues/2" target="_blank">Port Order Bug</a>
Fixed an issue where re-arranged ports would not have their order saved.

<hr>
# <a href="https://github.com/need4swede/portall/releases/tag/v1.0.1" target="_blank">v1.0.1</a>
## Added:
### Changelog section
Track changes between app versions. Found under `Settings > About`
### Planned Features section
See what is planned for future releases. Found under `Settings > About`
### linux/arm64 support
Added support for linux/arm64, which was absent in the initial release.
## Fixed:
### Docker-Compose import bug
Fixed bug that wouldn't detect ports for certain Docker-Compose imports

<hr>
# <a href="https://github.com/need4swede/portall/releases/tag/v1.0.0" target="_blank">v1.0.0</a>
### Initial Release
Initial public release of Portal