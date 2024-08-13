FROM python:3.12

WORKDIR /src

COPY requirements.txt ./

RUN pip install -r requirements.txt

COPY . .