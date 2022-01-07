<img src="https://related.chat/relatedchat/header1.png">

<img src="https://related.chat/relatedchat/pricing1.png">

<img src="https://related.chat/relatedchat/product2.png">

# Installation instructions

## Create a new AWS IAM User

1., Please click on the [following link](https://console.aws.amazon.com/iam/home#/users$new?step=review&accessKey&userNames=RelatedChat&permissionType=policies&policies=arn:aws:iam::aws:policy%2FAdministratorAccess) to create a new AWS Access Key with _Administrator Access_ permission

2., Click on "Create user" and download the CSV file associated with the new user

## Setup GitHub repository

1., Fork this repository

2., Select the **_Settings_** in the top navigation bar

3., Select the **_Secrets_** menu on the sidebar

4., Create the following repository secrets

- `AWS_ACCESS_KEY_ID` -> copy the access key ID from the CSV file
- `AWS_SECRET_ACCESS_KEY` -> copy the secret access key from the CSV file

## Deploy **Related:Chat**

1., Select the **_Actions_** in the top navigation bar

2., Click on **_Deploy Related:Chat_** workflow

3., Click on the dropdown button **_Run workflow_**

4., Click on **_Run workflow_**

5., Wait until the deployment process is finished

6., Your **Related:Chat** project is now ready to use 🎉🎉🎉

7., To get your website URL, please click on [this link](https://console.aws.amazon.com/amplify/home?region=us-east-1#/) and select **RelatedChat**

---

© Related Code 2021 - All Rights Reserved
