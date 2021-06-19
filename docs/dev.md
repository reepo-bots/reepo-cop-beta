# Development

## Staging  vs Production
Development of *reepo-cop* is split into 2 Repositories. [reepo-cop-beta](https://github.com/reepo-bots/reepo-cop-beta) is used to develop features seperate to the actual bot so that we may test features / fix bugs and can be thought of as the "staging" app that will be run started locally,

All on merger, a github workflow script will automatically copy the files over to the [reepo-cop](https://github.com/reepo-bots/reepo-cop) repository which is linked to a *heroku* project that hosts our "production" bot in the cloud.

## reepo-cop vs reepo-cop-beta
For the "staging & production" development model to work, there has to be 2 Github Applications used for each environment. [reepo-cop](https://github.com/apps/reepo-cop) environment details are listed on *heroku* while environment details of [reepo-cop-beta](https://github.com/apps/reepo-cop-beta) are used for local development. (NOTE: Do be sure to not list these details on Github 😅)