FROM amazon/aws-lambda-nodejs:14

COPY package*.json ./

RUN npm install --only=production

COPY src/ ./

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD [ "lambda.handler" ]