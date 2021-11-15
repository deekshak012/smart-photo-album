import json
import time
import boto3

FILE_NAME = "tmp_audio/input_audio.wav"
AWS_ACCESS_KEY_ID = "AKIAQC4E2T7MLHYM2ZGM"
AWS_SECRET_ACCESS_KEY = "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"
bucket_name = "storerecording"
OUTPUT_S3_NAME = "voice-search-transcription"

def lambda_handler(event, context):
    print("EVENT ", event)
    file_name = event["Records"][0]["s3"]["object"]["key"]
    transcribe = boto3.client('transcribe',
    aws_access_key_id = AWS_ACCESS_KEY_ID,
    aws_secret_access_key = AWS_SECRET_ACCESS_KEY,
    region_name = "us-east-1")

    transcription = amazon_transcribe(file_name, transcribe)


    s3 = boto3.client('s3',
      aws_access_key_id = AWS_ACCESS_KEY_ID,
      aws_secret_access_key = AWS_SECRET_ACCESS_KEY,
      region_name = "us-east-1")

    # s3.upload_file(file_name, bucket_name, file_name)
    print("THE TRANSCRIPTION IS")
    print(transcription)
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }


def check_job_name(job_name, transcribe):
  job_verification = True

  # all the transcriptions
  existed_jobs = transcribe.list_transcription_jobs()

  for job in existed_jobs['TranscriptionJobSummaries']:
    if job_name == job['TranscriptionJobName']:
      job_verification = False
      break

  if job_verification == False:
    transcribe.delete_transcription_job(TranscriptionJobName=job_name)

  return job_name


def amazon_transcribe(audio_file_name, transcribe):
  # S3 bucket access link
  job_uri = "s3://storerecording/" + audio_file_name

  # we take only a file name and delete all the space to name the job
  job_name = (audio_file_name.split('.')[0]).replace(" ", "")

  # file format
  file_format = audio_file_name.split('.')[1]

  # check if name is taken or not
  job_name = check_job_name(job_name, transcribe)
  transcribe.start_transcription_job(
      TranscriptionJobName=job_name,
      Media={'MediaFileUri': job_uri},
      MediaFormat = file_format,
      LanguageCode='en-US',
      OutputBucketName = OUTPUT_S3_NAME)

  result = transcribe.get_transcription_job(TranscriptionJobName=job_name)

  while (result["TranscriptionJob"]["TranscriptionJobStatus"] == "IN_PROGRESS"
  and result["TranscriptionJob"]["TranscriptionJobStatus"] != "FAILED"):
    result = transcribe.get_transcription_job(TranscriptionJobName=job_name)

    print("The job status is ", result["TranscriptionJob"]["TranscriptionJobStatus"])

  if result['TranscriptionJob']['TranscriptionJobStatus'] == "FAILED":
      return

  # print("The transcription result is ", result)

  # data = json.loads(result['TranscriptionJob']['Transcript']['TranscriptFileUri'])

  # return data['results'][1][0]['transcript']
  print("RESULT IS ", result)

  text_URI = result["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]

  return text_URI


def read_output(filename):
  # example filename: audio.json

  # take the input as the filename

  filename = (filename).split('.')[0]

  # Create an output txt file
  print(filename+'.txt')
  with open(filename+'.txt','w') as w:
    with open(filename+'.json') as f:

      data=json.loads(f.read())
      labels = data['results']['speaker_labels']['segments']
      speaker_start_times={}

      for label in labels:
        for item in label['items']:
          speaker_start_times[item['start_time']] = item['speaker_label']

      items = data['results']['items']
      lines = []
      line = ''
      time = 0
      speaker = 'null'
      i = 0

      # loop through all elements
      for item in items:
        i = i+1
        content = item['alternatives'][0]['content']

        # if it's starting time
        if item.get('start_time'):
          current_speaker = speaker_start_times[item['start_time']]

        # in AWS output, there are types as punctuation
        elif item['type'] == 'punctuation':
          line = line + content

        # handle different speaker
        if current_speaker != speaker:
          if speaker:
            lines.append({'speaker':speaker, 'line':line, 'time':time})
          line = content
          speaker = current_speaker
          time = item['start_time']

        elif item['type'] != 'punctuation':
          line = line + ' ' + content
      lines.append({'speaker': speaker, 'line': line,'time': time})

      # sort the results by the time
      sorted_lines = sorted(lines,key=lambda k: float(k['time']))

      # write into the .txt file
      for line_data in sorted_lines:
        line = '[' + str(datetime.timedelta(seconds=int(round(float(line_data['time']))))) + '] ' + line_data.get('speaker') + ': ' + line_data.get('line')
        w.write(line + '\n\n')


def upload_transcription():
    s3 = boto3.client('s3',
      aws_access_key_id = AWS_ACCESS_KEY_ID,
      aws_secret_access_key = AWS_SECRET_ACCESS_KEY,
      region_name = "us-east-1")
    # s3.upload_file(file_name, bucket_name, file_name)