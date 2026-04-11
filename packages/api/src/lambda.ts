import awsLambdaFastify from '@fastify/aws-lambda';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';

type LambdaHandler = (event: APIGatewayProxyEventV2, context: Context) => Promise<unknown>;

let handler: LambdaHandler | undefined;

async function getHandler(): Promise<LambdaHandler> {
  if (!handler) {
    await loadConfig();
    const app = await buildApp();
    handler = awsLambdaFastify(app) as LambdaHandler;
    await app.ready();
  }
  return handler;
}

export const lambdaHandler = async (event: APIGatewayProxyEventV2, context: Context) => {
  const h = await getHandler();
  return h(event, context);
};
