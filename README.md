# kwangwoon_swproject_[분산형 로그 분석기 및 수집현황 UI]

## 목표 

## 기능

## 팀원 및 업무분담
- 이승희
    -
- 임소리
    -
- 고유진
    - 
- 김유리
    -
    
## 개발기간
- 약 4달

# Apach tomcat 실행
```
./startup.sh
```
# filebeat 실행
```
./filebeat -e -c /etc/filebeat/filebeat.yml -d "publish"
```
# logstash 실행
```
./logstash -f /etc/logstash/conf.d/logstash.conf
```
# elasticsearch 실행
```
./elasticsearch
```
# node.js 실행
```
npm install

npm start
```