<p align="center">
  <img src="assets/img/doc_logo.png" width=600px />
</p>

<h2 align="center">reepo-cop</h2>
<h4 align="center">A Probot Application to help <strong>police</strong> your repository</h4>

---

This aims to help standardize and automate your repository management in a way that helps you save time and effort, allowing you to focus on your projects than the minutae of administration.

## Some Features
- Automated Issue / Pull Request Labelling
  - **Issues**: Autoamtically labels your issues using keywords in the title of your issues.
  - **Pull Requests**: Automatically labels your Pull Requests based on their status (i.e. Draft / Ready for Review)

- Automatic Changelog Updating
  - Updates your Changelogs on a Draft Release based on merged pull requests between your last release and current release. (Uses `issue.*` labels given to your PRs as headers).

---

Feel free to fork this and customize it to your own needs 😃

## Reference Docs
- [Probot Bootstrap Doc](../docs/probot_doc.md)
- [**reepo-cop**'s development](../docs/dev.md)