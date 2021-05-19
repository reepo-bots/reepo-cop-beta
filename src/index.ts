import { Probot } from "probot";
import { LabelService } from "./services/labelService";
import { OctokitLabelResponse } from "./services/labelService";

const labelService: LabelService = new LabelService();

export = (app: Probot) => {

  app.on(['issues', 'pull_request', 'label'], async(context) => {
    const octokitResponse = await context.octokit.issues.listLabelsForRepo(context.repo());
    const repoOwnerData = context.repo();
    const labelCreator: (name: string, desc: string, color: string) => Promise<any> = 
      async (name: string, desc: string, color: string) => await context
        .octokit
        .rest
        .issues
        .createLabel(
          {
            ...repoOwnerData,
            name: name,
            description: desc,
            color: color
          }
    );
    const labelUpdater: (oldName: string, newName: string, desc: string, color: string) => Promise<any> =
      async (oldName: string, newName: string, desc: string, color: string) => await context
        .octokit
        .rest
        .issues
        .updateLabel(
          {
            ...repoOwnerData,
            name: oldName,
            new_name: newName,
            description: desc,
            color: color
          }
    );
    labelService.generateMissingLabels(
      labelService.updateLabels(
        octokitResponse.data as OctokitLabelResponse[],
        labelUpdater
      ),
      labelCreator
    )
  })

  app.on("issues.opened", async (context) => {
    const issueComment = context.issue({
      body: "Thanks for opening this issue!",
    });
    
    await context.octokit.issues.createComment(issueComment);
  });
  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
};
