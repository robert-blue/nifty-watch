# nifty-watch
Dashboard for monitoring NFT floor prices

![image](https://user-images.githubusercontent.com/4468737/141231466-cc3f13c9-69f8-47a0-ae74-2092fa9ee8dd.png)

## How to Use

| Commands       | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `yarn install` | One-time setup of dependencies                           |
| `yarn serve`   | Serve site in nginx container at http://localhost:8000 * |
| `yarn lint`    | Enforce code style with autofix                          |

\* This is required because the app uses ES6 modules in the browser, and CORS restrictions prevent it from working as a local file. The container's website root is mounted to the host, so just edit files and refresh the browser to see your changes.