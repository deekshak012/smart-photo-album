import json
import boto3
from opensearchpy import OpenSearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

def lambda_handler(event, context):
    print(event)
    print(event['queryStringParameters']['q'])
    
    try:
        slots = lexbot(event['queryStringParameters']['q'])
    except:
        return { 
        'statusCode': 400,
        'body': json.dumps({"response": "Bad request, input format is wrong"})
    }
    
    images = getImages(slots)
    
    return { 
        'statusCode': 200,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*'
        },
        'body': json.dumps({"response": images})
    }

def lexbot(input):
    lex = boto3.client('lex-runtime')
    response = lex.post_text(
        botName='SearchPhotos',
        botAlias='$LATEST',
        userId='root',
        inputText=input
    )   
   
    responseSlots = response['slots']
    print(responseSlots)
    slots = [s for k, s in responseSlots.items() if s]
    return slots
    

def getImages(searchKeys):
    host = 'search-photosearch-c64otgs6bbgbk6bpu5ez24b2fy.us-east-1.es.amazonaws.com'

    client = OpenSearch(
        hosts=[{'host': host, 'port': 443}],
        http_auth=('masteruser','Test@1234'),
        use_ssl=True,
        verify_certs=True,
        connection_class=RequestsHttpConnection
    )
    labeledPictures =[]
    for keys in searchKeys:
        labeledPictures.append({"match": {"labels": keys}})
        
    query = {"query": {"bool": {"should": labeledPictures}}}
    
    print(query)
    result = client.search(index="photosearch", doc_type="photos", body = query)
    print(result)
    imageURL = []
    
    for each in result['hits']['hits']:
        objectKey = each['_source']['objectKey']
        bucket = each['_source']['bucket']
        image_url = "https://" + bucket + ".s3.amazonaws.com/" + objectKey
        imageURL.append(image_url)
        
    print(imageURL)
    return imageURL
    
    
    