---
title: '[연재] 파이썬 컨테이너 선택 제 3형 - 파이썬 컨테이너 실전비교'
date: "2024-11-24T23:57:00.000Z"
template: "post"
draft: false
slug: "/devlog/python/2024-11-24-python-container-101-pt02"
category: "devlog"
tags:
  - "python"
  - "geultto"
description: '파이썬 컨테이너 최적화 기법을 이용하여 CPU bound 작업과 IO bound 작업을 직접 구동해봅니다.'
socialImage: { "publicURL": "./media/sangdo-dong.jpg" }
---

이번 게시글에서는 Debian 기반의 컨테이너와 Alpine 기반의 컨테이너 간 성능을 비교해보도록 하겠습니다.

지난 게시글에는 분명 이렇게 소개했습니다.
- I/O bound 태스크 중심: API 서비스를 만들고, DB에는 1억개의 데이터을 추가한 후, 쿼리 테스트 및 부하 테스트를 수행하여 성능을 리포트
- CPU bound 태스크 중심: 매우 큰 데이터를 pandas로 처리, matplotlib으로 연산하게 구성해보고 성능을 리포트

하지만, 구동 시간이 너무 오래걸려 본 게시글에는 테스트 방안을 "소개"하고, 글을 수정하여 보강할 예정입니다. 벌써부터 이렇게 말씀드리는 점 양해 부탁드립니다. 🙇🙇

아래와 같이 변경될 예정입니다:
- I/O bound 태스크 중심: ~~API 서비스를 만들고~~, DB에는 10만 개의 데이터을 추가한 후, 쿼리 테스트 ~~및 부하 테스트를~~ 수행하여 성능을 리포트
- CPU bound 태스크 중심: K-means clustering 과 랜덤 포레스트 기법을 ~~SVD 연산(준비만 되어있습니다!)~~ 사용하여 ~~매우 큰 데이터를 pandas로 처리, matplotlib으로 연산하게 구성해보고~~ CPU, 메모리 사용량을 리포트

그렇다면, 목표와 준비 후, 가절을 세우고 직접 실험해봅시다.

# **목표**

파이썬으로 작성한 cpu bound task와 io bound task 를 각각 컨테이너화 했을 때, glibc, musl 구현체의 성능 벤치마킹을 통해 적절한 구현체가 무엇인지 파악해봅시다.

## **준비**

1. c 라이브러리 구현체 선택
    - 앞어 설명드린 바 대로, C 라이브러리의 구현체는 glibc/musl 이 있습니다.
2. 저희는 2부에서 설명드린 바와 같이, 도커 컨테이너를 아래와 같이 선택하기로 했습니다
    - `glibc` C 라이브러리 기반의 운영체제 이미지
    - `musl` C 라이브러리 기반의 운영체제 이밎
3. 성능을 가리는 조건은 두가지로 한정짓습니다.
    1. cpu bound
        - cpu를 많이 쓰는 태스크 (cpu 연산 그 자체)
    2. io bound
        - io작업이 많은 태스크 (E.g., 서버 업/다운로드, db 콜)
4. 해당 코드를 구동하는 환경은 아래와 같습니다
    1. (로컬 테스트) - M3 Pro 맥북
    2. (**예정**, 실제 환경과 유사한 테스트) - GitHub Actions

### CPU bound 작업을 선별합시다

CPU bound 태스크를 테스트하기 위해, 랜덤 포레스트와 K-means clustering을 각각 구동해보기로 했습니다.

1. 각종 머신러닝 기법을 진짜 맛만보는 코드를 작성했습니다. 아래는 제가 구동하려는 태스크들입니다.
- 랜덤 포레스트
    - 다량의 서로 다른 샘플과 특성이 반영된 decision tree를 구성한다.
    - 트리 연산은 병렬로 수행하고, 결과값은 다수결로/평균값으로 도출된다
    - overfitting(과적합)을 방지하는 앙상블 방법이다
- k-means clustering
    - k-means - 비지도 학습(unsupervised learning) 알고리즘 - 을 기반으로 한 클러스터링 알고리즘
    - 데이터 포인트들을 K개의 그룹(클러스터)으로 나눈다
    - 비슷한 특성을 가진 데이터끼리 같은 그룹으로 묶음
    - "비슷하다"의 기준은 데이터 포인트 간의 거리 (주로 유클리드 거리 사용)

이 태스크로 선정한 이유는 아래와 같습니다:

1. 여러 복합적인 연산을 수행하기 위해 CPython 구현체나 C 코드로 빌드된 코드를 사용함으로 인해 발생하는 성능차이가 분명히 있을 것이라고 생각했기 때문입니다.
2. 단순 연산(소수 구하기, 해쉬연산 지속적으로 수행하기)는 CPU 레벨에서 최적화되어 인터프리트 되면 크게 의미없다고 판단했기 때문입니다.

### IO bound 작업을 선별합니다.

아래와 같이 테이블 구성
1. 기관 테이블을 구성, 기관의 고유식별자를 fk로 쓰는 '기관정보' 테이블 구성
2. 유저 테이블을 생성
3. 이 테이블의 uuid 값을 fk로 쓰는 테이블을 아래와 같이 구성
    - '유저 개인정보'
    - '유저 프로필 정보'

# **가설**

이번 실험을 통해 세운 가설은 아래와 같습니다.

- glibc, musl은 cpu bound task, io bound task 별로 성능차이가 있을 것입니다.
    - 근거: 여러 작업(precondition, postcondition 이나 실제 구현체 이용)을 많이 하면 각 구현체별 성능차가 있을 것이기 때문입니다.

# **작업 순서**

여기서부터는 작성한 코드를 참고해주세요. 코드는 [이 github 링크]() 에 준비되어 있습니다.

1. 컨테이너 만들기
    1. debian based (slim 이미지인가, 아닌가의 차이도 명확한지 파악 필요)
    2. alpine based
2. cpu bound task를 수행하는 코드 작성하기 (wip)
    1. random forest를 병렬 작업하는 코드
    2. k-means clustering을 병렬 작업하는 코드
3. io bound task를 수행하는 코드 작성하기
    1. 10만 건의 유저 데이터(하위 테이블 포함)를 추가하고, 개별 유저에 대해 개인정보를 추가하여 쿼리를 수행
    2. 유저를 1000명씩 임의로 쿼리 수행
4. python 버전, 태스크 별로 각각 테스트 수행

# **리뷰 (1)**

하지만 작업 중간에, 아래와 같은 리뷰사항을 받고 태스크의 내용을 한 번 수정했습니다. 확실히 조사가 필요한 부분 및 보강이 가능한 부분에 대해 다듬었습니다.

1. cpu bound task 보완
    - 데이터셋 크기, 하이퍼 파라미터는 수행 전 별도로 기재하여 실험상에 어떻게 쓰였는지 글로 작성
    - 멀티 프로세싱을 고려해야하나? - 현재는 포기
        - ("확실한" 조사 필요) 파이썬에서 이런 태스크가 GIL이 처리하려면 `n_jobs` 파라미터 만으로 처리가능한지
        - ("확실한" 조사 필요) 이걸 컨테이너로 처리하면 환경변수로 처리하고, 개별 컨테이너 별 부여받은 최대 CPU만큼 쓰면 되는지 

2. io bound task 보완
    - rdbms는 postgres 15버전 사용 예정. 
    - ~~커넥션 풀링은 sqlalchemy의 기본 사용량을 써보고, 너무 처참한 p95 값이 나오면 (1초 이상) 조절 예정~~ (API로 부하 테스트까지 해보는 것이 목표입니다만, 거기까지는 아직 진행을 못했습니다.. 🥲)
    - 쿼리 유형 다각화 - 어떻게 진행하면 좋을지?
        - 실질적으로 많이 일어나는건 쿼리라고 판단함
    - db에 추가하는 건 어떻게 보면 테스트 데이터 준비과정으로 이해하고, 쿼리의 성능을 살펴보는 것이 중요할 것으로 판단. 일반적인 시스템에서 추가보다는 조회가 훨씬 더 많이 일어나기 때문.

# **실제 실험결과**

실험 결과는 위에서 소개시켜드렸던 결과로 구동하려 합니다.

## CPU bound 태스크의 결과 (1) - Random forest

Debian 기반의 컨테이너로 CPU bound 태스크를 구동해본 결과는 아래와 같았습니다:

| Image | Version | Trees | Training (s) | Prediction (s) | Total (s) |
|-------|---------|-------|--------------|----------------|-----------|
| Alpine | `3.12` | 1 | 1.87 | 0.02 | 1.89 |
| Alpine | `3.12` | 10 | 5.98 | 0.06 | 6.04 |
| Alpine | `3.12` | 100 | 46.62 | 0.44 | 47.06 |
| Alpine | `3.13` | 1 | 2.40 | 0.03 | 2.43 |
| Alpine | `3.13` | 10 | 6.16 | 0.07 | 6.23 |
| Alpine | `3.13` | 100 | 48.25 | 0.53 | 48.78 |
| Debian | `3.12` | 1 | 1.93 | 0.02 | 1.96 |
| Debian | `3.12` | 10 | 5.93 | 0.07 | 6.00 |
| Debian | `3.12` | 100 | 46.82 | 0.42 | 47.24 |
| Debian | `3.13` | 1 | 2.35 | 0.03 | 2.38 |
| Debian | `3.13` | 10 | 6.34 | 0.10 | 6.44 |
| Debian | `3.13` | 100 | 49.17 | 0.49 | 49.66 |

<details>
<summary>베이스 이미지 - Alpine 3.12 의 작업결과</summary>

```log
Dataset generated: 100000 samples with 100 features

Testing RandomForest with 1 trees...
Training time: 1.87 seconds
Prediction time: 0.02 seconds
Total time: 1.89 seconds

Testing RandomForest with 2 trees...
Training time: 1.92 seconds
Prediction time: 0.03 seconds
Total time: 1.95 seconds

Testing RandomForest with 5 trees...
Training time: 3.51 seconds
Prediction time: 0.05 seconds
Total time: 3.56 seconds

Testing RandomForest with 10 trees...
Training time: 5.98 seconds
Prediction time: 0.06 seconds
Total time: 6.04 seconds

Testing RandomForest with 25 trees...
Training time: 11.93 seconds
Prediction time: 0.14 seconds
Total time: 12.07 seconds

Testing RandomForest with 50 trees...
Training time: 22.90 seconds
Prediction time: 0.24 seconds
Total time: 23.14 seconds

Testing RandomForest with 100 trees...
Training time: 46.62 seconds
Prediction time: 0.44 seconds
Total time: 47.06 seconds

Summary:
 Trees   Train(s) Predict(s)   Total(s)
----------------------------------------
     1       1.87       0.02       1.89
     2       1.92       0.03       1.95
     5       3.51       0.05       3.56
    10       5.98       0.06       6.04
    25      11.93       0.14      12.07
    50      22.90       0.24      23.14
   100      46.62       0.44      47.06
```

</details>


<details>
<summary>베이스 이미지 - Alpine 3.13 의 작업결과</summary>

```log
Dataset generated: 100000 samples with 100 features

Testing RandomForest with 1 trees...
Training time: 2.40 seconds
Prediction time: 0.03 seconds
Total time: 2.43 seconds

Testing RandomForest with 2 trees...
Training time: 2.32 seconds
Prediction time: 0.05 seconds
Total time: 2.37 seconds

Testing RandomForest with 5 trees...
Training time: 4.15 seconds
Prediction time: 0.08 seconds
Total time: 4.23 seconds

Testing RandomForest with 10 trees...
Training time: 6.16 seconds
Prediction time: 0.07 seconds
Total time: 6.23 seconds

Testing RandomForest with 25 trees...
Training time: 12.64 seconds
Prediction time: 0.15 seconds
Total time: 12.80 seconds

Testing RandomForest with 50 trees...
Training time: 24.41 seconds
Prediction time: 0.27 seconds
Total time: 24.68 seconds

Testing RandomForest with 100 trees...
Training time: 48.25 seconds
Prediction time: 0.53 seconds
Total time: 48.78 seconds

Summary:
 Trees   Train(s) Predict(s)   Total(s)
----------------------------------------
     1       2.40       0.03       2.43
     2       2.32       0.05       2.37
     5       4.15       0.08       4.23
    10       6.16       0.07       6.23
    25      12.64       0.15      12.80
    50      24.41       0.27      24.68
   100      48.25       0.53      48.78
```

</details>

<details>
<summary>베이스 이미지 - Debian 3.12 의 작업결과</summary>

```log
Dataset generated: 100000 samples with 100 features

Testing RandomForest with 1 trees...
Training time: 1.93 seconds
Prediction time: 0.02 seconds
Total time: 1.96 seconds

Testing RandomForest with 2 trees...
Training time: 2.01 seconds
Prediction time: 0.03 seconds
Total time: 2.04 seconds

Testing RandomForest with 5 trees...
Training time: 3.83 seconds
Prediction time: 0.05 seconds
Total time: 3.88 seconds

Testing RandomForest with 10 trees...
Training time: 5.93 seconds
Prediction time: 0.07 seconds
Total time: 6.00 seconds

Testing RandomForest with 25 trees...
Training time: 12.12 seconds
Prediction time: 0.12 seconds
Total time: 12.24 seconds

Testing RandomForest with 50 trees...
Training time: 23.62 seconds
Prediction time: 0.27 seconds
Total time: 23.89 seconds

Testing RandomForest with 100 trees...
Training time: 46.82 seconds
Prediction time: 0.42 seconds
Total time: 47.24 seconds

Summary:
 Trees   Train(s) Predict(s)   Total(s)
----------------------------------------
     1       1.93       0.02       1.96
     2       2.01       0.03       2.04
     5       3.83       0.05       3.88
    10       5.93       0.07       6.00
    25      12.12       0.12      12.24
    50      23.62       0.27      23.89
   100      46.82       0.42      47.24
```

</details>

<details>
<summary>베이스 이미지 - Debian 3.13 의 작업결과</summary>

```log
Dataset generated: 100000 samples with 100 features

Testing RandomForest with 1 trees...
Training time: 2.35 seconds
Prediction time: 0.03 seconds
Total time: 2.38 seconds

Testing RandomForest with 2 trees...
Training time: 2.21 seconds
Prediction time: 0.05 seconds
Total time: 2.26 seconds

Testing RandomForest with 5 trees...
Training time: 4.18 seconds
Prediction time: 0.05 seconds
Total time: 4.23 seconds

Testing RandomForest with 10 trees...
Training time: 6.34 seconds
Prediction time: 0.10 seconds
Total time: 6.44 seconds

Testing RandomForest with 25 trees...
Training time: 12.59 seconds
Prediction time: 0.13 seconds
Total time: 12.72 seconds

Testing RandomForest with 50 trees...
Training time: 25.04 seconds
Prediction time: 0.27 seconds
Total time: 25.30 seconds

Testing RandomForest with 100 trees...
Training time: 49.17 seconds
Prediction time: 0.49 seconds
Total time: 49.66 seconds

Summary:
 Trees   Train(s) Predict(s)   Total(s)
----------------------------------------
     1       2.35       0.03       2.38
     2       2.21       0.05       2.26
     5       4.18       0.05       4.23
    10       6.34       0.10       6.44
    25      12.59       0.13      12.72
    50      25.04       0.27      25.30
   100      49.17       0.49      49.66
```

</details>

## CPU bound 태스크의 결과 (2) - K-means clustering

표로 정리하면 아래와 같습니다:

| Image | Version | Samples | Clusters | Execution Time (s) |
|-------|---------|---------|----------|-------------------|
| Debian | `3.12` | 1,000,000 | 3 | 4.72 |
| Debian | `3.12` | 1,000,000 | 5 | 4.90 |
| Debian | `3.12` | 5,000,000 | 3 | 10.37 |
| Debian | `3.12` | 5,000,000 | 5 | 12.18 |
| Alpine | `3.12` | 1,000,000 | 3 | 5.50 |
| Alpine | `3.12` | 1,000,000 | 5 | 4.81 |
| Alpine | `3.12` | 5,000,000 | 3 | 11.90 |
| Alpine | `3.12` | 5,000,000 | 5 | 12.71 |
| Debian | `3.13` | 100,000 | 5 | 2.74 |
| Debian | `3.13` | 100,000 | 7 | 3.50 |
| Debian | `3.13` | 500,000 | 5 | 6.92 |
| Debian | `3.13` | 500,000 | 7 | 6.92 |

> 🍅 disclaimer
>
> `scikit-learn` 의 공식 지원이 3.12 까지라, Alpine 리눅스에서는 3.13 베이스 이미지에서 구동이 어려웠습니다.

<details>
<summary>베이스 이미지 - Alpine 3.12 의 작업결과</summary>

```log
Running benchmark for 1000000 samples, 3 clusters...

Execution time: 5.50 seconds
Iterations: 2
Inertia: 128018685.50
Average CPU Usage: 801.99%
Average Memory Usage: 12.59%
Peak CPU Usage: 1261.70%
Peak Memory Usage: 17.07%
Running benchmark for 1000000 samples, 5 clusters...
Execution time: 4.81 seconds
Iterations: 2
Inertia: 128018441.10
Average CPU Usage: 1014.51%
Average Memory Usage: 23.78%
Peak CPU Usage: 1206.10%
Peak Memory Usage: 28.70%
Running benchmark for 5000000 samples, 3 clusters...
Execution time: 11.90 seconds
Iterations: 2
Inertia: 640003227.45
Average CPU Usage: 723.35%
Average Memory Usage: 69.71%
Peak CPU Usage: 1208.10%
Peak Memory Usage: 92.17%
Running benchmark for 5000000 samples, 5 clusters...
Execution time: 12.71 seconds
Iterations: 2
Inertia: 640002946.03
Average CPU Usage: 945.65%
Average Memory Usage: 64.20%
Peak CPU Usage: 1206.70%
Peak Memory Usage: 90.08%
Plotting Data Summary:
Dataset Size: 1000000, Clusters: 3
Execution Time: 5.50s
CPU Usage: 52 points, Range: [0.0, 1261.7]
Memory Usage: 52 points, Range: [6.5, 17.1]
Dataset Size: 1000000, Clusters: 5
Execution Time: 4.81s
CPU Usage: 47 points, Range: [93.4, 1206.1]
Memory Usage: 47 points, Range: [18.0, 28.7]
Dataset Size: 5000000, Clusters: 3
Execution Time: 11.90s
CPU Usage: 112 points, Range: [47.9, 1208.1]
Memory Usage: 112 points, Range: [37.9, 92.2]
Dataset Size: 5000000, Clusters: 5
Execution Time: 12.71s
CPU Usage: 121 points, Range: [86.0, 1206.7]
Memory Usage: 121 points, Range: [35.7, 90.1]
```

</details>


<details>
<summary>(수행불가) 베이스 이미지 - Alpine 3.13 의 작업결과</summary>

구동 불가!

</details>

<details>
<summary>베이스 이미지 - Debian 3.12 의 작업결과</summary>

```log
Running benchmark for 1000000 samples, 3 clusters...
Execution time: 4.72 seconds
Iterations: 2
Inertia: 128018685.50
Average CPU Usage: 907.44%
Average Memory Usage: 12.71%
Peak CPU Usage: 1199.30%
Peak Memory Usage: 17.33%
Running benchmark for 1000000 samples, 5 clusters...
Execution time: 4.90 seconds
Iterations: 2
Inertia: 128018441.10
Average CPU Usage: 1044.18%
Average Memory Usage: 12.94%
Peak CPU Usage: 1218.20%
Peak Memory Usage: 18.36%
Running benchmark for 5000000 samples, 3 clusters...
Execution time: 10.37 seconds
Iterations: 2
Inertia: 640003227.45
Average CPU Usage: 793.64%
Average Memory Usage: 59.11%
Peak CPU Usage: 1208.20%
Peak Memory Usage: 83.59%
Running benchmark for 5000000 samples, 5 clusters...
Execution time: 12.18 seconds
Iterations: 2
Inertia: 640002946.03
Average CPU Usage: 959.31%
Average Memory Usage: 57.18%
Peak CPU Usage: 1210.40%
Peak Memory Usage: 83.59%
Plotting Data Summary:
Dataset Size: 1000000, Clusters: 3
Execution Time: 4.72s
CPU Usage: 46 points, Range: [0.0, 1199.3]
Memory Usage: 46 points, Range: [6.5, 17.3]
Dataset Size: 1000000, Clusters: 5
Execution Time: 4.90s
CPU Usage: 48 points, Range: [93.4, 1218.2]
Memory Usage: 48 points, Range: [7.5, 18.4]
Dataset Size: 5000000, Clusters: 3
Execution Time: 10.37s
CPU Usage: 100 points, Range: [96.5, 1208.2]
Memory Usage: 100 points, Range: [29.2, 83.6]
Dataset Size: 5000000, Clusters: 5
Execution Time: 12.18s
CPU Usage: 118 points, Range: [88.9, 1210.4]
Memory Usage: 118 points, Range: [29.2, 83.6]
```

</details>

<details>
<summary>베이스 이미지 - Debian 3.13 의 작업결과</summary>

```log
Running benchmark for 100000 samples, 5 clusters...
Execution time: 2.74 seconds
Iterations: 2
Inertia: 12800855.22
Average CPU Usage: 392.67%
Average Memory Usage: 2.48%
Peak CPU Usage: 536.20%
Peak Memory Usage: 2.52%
Running benchmark for 100000 samples, 7 clusters...
Execution time: 3.50 seconds
Iterations: 2
Inertia: 12800608.95
Average CPU Usage: 400.08%
Average Memory Usage: 2.50%
Peak CPU Usage: 564.40%
Peak Memory Usage: 2.52%
Running benchmark for 500000 samples, 5 clusters...
Execution time: 6.92 seconds
Iterations: 2
Inertia: 64009635.94
Average CPU Usage: 366.32%
Average Memory Usage: 7.00%
Peak CPU Usage: 671.20%
Peak Memory Usage: 9.58%
Running benchmark for 500000 samples, 7 clusters...
Execution time: 6.92 seconds
Iterations: 2
Inertia: 64009455.56
Average CPU Usage: 382.56%
Average Memory Usage: 6.93%
Peak CPU Usage: 601.80%
Peak Memory Usage: 7.32%
Plotting Data Summary:
Dataset Size: 100000, Clusters: 5
Execution Time: 2.74s
CPU Usage: 26 points, Range: [0.0, 536.2]
Memory Usage: 26 points, Range: [1.7, 2.5]
Dataset Size: 100000, Clusters: 7
Execution Time: 3.50s
CPU Usage: 33 points, Range: [157.3, 564.4]
Memory Usage: 33 points, Range: [2.0, 2.5]
Dataset Size: 500000, Clusters: 5
Execution Time: 6.92s
CPU Usage: 64 points, Range: [97.0, 671.2]
Memory Usage: 64 points, Range: [4.1, 9.6]
Dataset Size: 500000, Clusters: 7
Execution Time: 6.92s
CPU Usage: 65 points, Range: [95.2, 601.8]
Memory Usage: 65 points, Range: [4.3, 7.3]
```

</details>

## I/O bound 태스크의 결과 (1) - 10만 건의 데이터 조회 결과

Debian 기반의 컨테이너로 IO bound 태스크를 구동해본 결과는 아래와 같았습니다:

Alpine 기반의 컨테이너로 IO bound 태스크를 구동해본 결과는 아래와 같았습니다:

# 결론

## CPU bound

의외로, 미미한 차이가 있었고 심지어는 Alpine 기반 컨테이너가 근소하게나마 빨랐습니다.

## I/O bound

# 종합하여

CPU bound task에서 의외로 미미한 차이로 Alpine이 앞섰다는 점에서 놀라웠습니다.