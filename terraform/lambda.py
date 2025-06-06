import logging
import boto3


def handler(event, context):
    logging.getLogger().setLevel(logging.INFO)
    logging.info('Creating ECS client')
    ecs_client = boto3.client('ecs')

    print(event)

    logging.info(f'Primary Service ARN: {event["primary_service_arn"]}')
    logging.info(f'Fallback Service ARN: {event["fallback_service_arn"]}')

    if event['event_name'] == 'SERVICE_TASK_PLACEMENT_FAILURE':
        logging.info('Service task failed to be placed. Initiating fallback.')

        logging.info(f'Describing {event["primary_service_arn"]} in cluster {event["primary_service_arn"]}')
        result = ecs_client.describe_services(cluster=event['cluster_arn'], services=[event['primary_service_arn']])
        primary_service_desired_count = result['services'][0]['desiredCount']

        logging.info(f'Setting desired count of {event["fallback_service_arn"]} to {primary_service_desired_count}')
        ecs_client.update_service(cluster=event['cluster_arn'], service=event['fallback_service_arn'], desiredCount=primary_service_desired_count)

    elif event['event_name'] == 'SERVICE_STEADY_STATE':
        logging.info('The primary service reached steady state.')

        logging.info(f'Setting desired count of {event["fallback_service_arn"]} to 0')
        ecs_client.update_service(cluster=event['cluster_arn'], service=event['fallback_service_arn'], desiredCount=0)

    else:
        logging.warning(f'Received an unsupported event {event["event_name"]}')
