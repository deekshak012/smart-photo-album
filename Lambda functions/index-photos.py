import json
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth
from datetime import datetime

def lambda_handler(event, context):
    print(event)
    host = 'search-photosearch-c64otgs6bbgbk6bpu5ez24b2fy.us-east-1.es.amazonaws.com'
    for singleEvent in event['Records']:
        bucketName = singleEvent['s3']['bucket']['name']
        photoName = singleEvent['s3']['object']['key']

        #get labels for the image after Rekognition
        labels = getLabels(bucketName,photoName)
        
        customLabels = getCustomLabels(bucketName,photoName)
        
        labels += customLabels
        
        now = datetime.utcnow()
        
        search = OpenSearch(
            hosts=[{'host': host, 'port': 443}],
            http_auth=('masteruser','Test@1234'),
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection
        )
        
        openSearchObject = {
            "objectKey" : photoName,
            "bucket" : bucketName,
            "createdTimestamp" : now.strftime("%Y-%m-%dT%H:%M:%S"),
            "labels" : labels
        }
        
        search.index(
                index="photosearch",
                doc_type="photos",
                id = photoName,
                body=openSearchObject,
            )
        
        print(openSearchObject)
        
    
    return {
        'statusCode': 200,
        'body': json.dumps('Posted to ES')
    }

def getLabels(bucketName, photoName):
    client = boto3.client('rekognition')
    print(client)
    response = client.detect_labels(
        Image={'S3Object': {'Bucket': bucketName, 'Name': photoName}}, 
        MaxLabels=10,
        MinConfidence=90
    )
    print(response)
    labels = []
    for label in response['Labels']:
        labels.append(label['Name'])
    print(labels)
    
    return labels
    
def getCustomLabels(bucketName,photoName):
    client = boto3.client('s3')
    response = client.head_object(
        Bucket=bucketName,
        Key=photoName,
    )
    print(response)
    customLabels = response['Metadata']['customlabels']
    customLabels = [x.strip() for x in customLabels.split(',')]
    print(customLabels)
    
    return customLabels
    
    
    