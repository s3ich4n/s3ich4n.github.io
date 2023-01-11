---
title: "간략히 써본 서버 점검 가이드"
date: "2021-02-03T10:17:43.000Z"
template: "post"
draft: false
slug: "/tips/2021-02-03-server-maintenance-guide"
category: "tips"
tags:
  - "maintenance"
description: "서버 점검과 관련하여"
socialImage: { "publicURL": "./media/aa.jpg" }
---

서버 점검과 관련하여 좋은글들을 추합한 내용을 공유합니다.

# 작성에 앞서...

이 글은 좋은 글을 가져와 제 입맛에 맞게 정리한 것에 불과합니다. 제 스스로 되새김질 하기 위해 썼기 때문에, 하단의 참조링크를 반드시 보실 것을 권해드립니다.

# Prerequisite

- 서버에 부하가 걸리는 명령은, `ionice` 커맨드를 붙여서 사용합니다.

```bash
ionice -c 2 -n 7 nice -n 19
# -c 2: 디스크 I/O의 실행 우선 순위 조정
# -n 7: 명령의 우선 순위를 낮추는
# -n 19: 프로세스 실행 우선 순위를 가장 낮게
```

- `vi`로 파일확인 대신, `less`, `more` 혹은 `cat`을 사용합니다.

| 명령 | 설명                                                                                                                              |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- |
| less | 파일의 내용을 표시하며 스크롤 있고, vi와 달리 전체 파일을 로드하지 않기 때문에 시작이 빠고 q를 누르면 종료합니다.                 |
| more | 파일의 내용을 표시하며 스크롤 있고, 첫 행까지 표시하고 종료합니다. less와 달리 q 버튼으로 종료해도 출력이 터미널에 남아 있습니다. |

- 작업 결과 등의 일시적인 파일 저장은 `/tmp` 와 `/var/tmp` 에 저장합니다(파일 삭제를 할 필요가 없음).

  - `/tmp`를 (`tmpfs`에 마운트 된 경우) 다시 시작하면 파일이 사라집니다.
  - `/var/tmp`는 다시 시작해도 파일은 사라지지 않고 `/tmp`보다 오랜 기간 유지됩니다.
  - `/tmp`(10일), `/var/tmp`(30일) 둘다 정기적으로 지워집니다.
    - 서버에 설정된 사항은 `more /usr/lib/tmpfiles.d/tmp.conf` 로 확인 가능합니다.

- history에서 커맨드 기록을 삭제해야 할 때는 다음 명령을 수행합니다:
  - `history | less`: 명령어를 수행한 번호를 파악합니다.
  - `history -d 42`: 명령어를 통해 스크립트 수행 기록을 삭제합니다.

# 1. 서버 구동시간 확인

```bash
uptime
```

# 2. dmesg를 이용한 OS 레벨의 에러메시지 특이사항 확인

```bash
dmesg | tail
```

# 3. 메모리 확인

```bash
free -hm # human readable, mebibyte 단위로 출력
```

- 또는 아래 스크립트를 작성해두어 메모리를 확인합니다.

```bash
#!/bin/bash
export LANG=C, LC_ALL=C

free | awk '
    BEGIN{
        total=0; used=0; available=0; rate=0;
    }

    /^Mem:/{
        total = $2;
        available = $7;
    }

    END {
        used = total - available;
        rate= 100 * used / total;
        printf("total(KB)\tused(KB)\tavailable(KB)\tused-rate(%)\n");
        printf("%d \t %d \t %d \t %.1f\n", total, used, available, rate);
    }';
```

- 실행결과

```bash
bash memory-usage-free.sh
total(KB)	used(KB)	available(KB)	used-rate(%)
7747768 	4783068 	2964700 	    61.7
```

# 4. 파일 시스템 확인

```bash
# 파일 시스템 확인
df -Th

# 디스크 사용량 순으로 확인하는 스크립트
ionice -c 2 -n 7 nice -n 19 du -scm /* | sort -rn
```

- scm 옵션
  - 하위 디렉토리 숨기기 + 전체 디스크 사용량 표시 + M 바이트 형식으로 표시이고 rn 옵션은 사용량이 많은 순서로 + 수치로 비교합니다.

# 5. 네트워크 상태 확인

- 아래 스크립트를 통해 `TIME_WAIT` 및 `CLOSE_WAIT` 현황 파악을 수행합니다.

```bash
#!/bin/bash
COUNT=10
while :
do
        if [ $COUNT = 10 ]
        then
                printf "+--------+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+ \n"
                printf "|  TIME  |ESTAB|LISTN|T_WAT|CLOSD|S_SEN|S_REC|C_WAT|F_WT1|F_WT2|CLOSI|L_ACK| \n"
                printf "+--------+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+ \n"
                COUNT=0
        fi
        COUNT=`expr $COUNT + 1`
        TIME=`/bin/date +%H:%M:%S`
        printf "|%s" ${TIME}
        netstat -an | \
        awk 'BEGIN {
                CLOSED = 0;
                LISTEN = 0;
                SYN_SENT = 0;
                SYN_RECEIVED = 0;
                ESTABLISHED = 0;
                CLOSE_WAIT = 0;
                FIN_WAIT_1 = 0;
                FIN_WAIT_2 = 0;
                CLOSING = 0;
                LAST_ACK = 0;
                TIME_WAIT = 0;
                OTHER = 0;
                }
                $6 ~ /^CLOSED$/ { CLOSED++; }
                $6 ~ /^CLOSE_WAIT$/ { CLOSE_WAIT++; }
                $6 ~ /^CLOSING$/ { CLOSING++; }
                $6 ~ /^ESTABLISHED$/ { ESTABLISHED++; }
                $6 ~ /^FIN_WAIT1$/ { FIN_WAIT_1++; }
                $6 ~ /^FIN_WAIT2$/ { FIN_WAIT_2++; }
                $6 ~ /^LISTEN$/ { LISTEN++; }
                $6 ~ /^LAST_ACK$/ { LAST_ACK++; }
                $6 ~ /^SYN_SENT$/ { SYN_SENT++; }
                $6 ~ /^SYN_RECV$/ { SYN_RECEIVED++; }
                $6 ~ /^TIME_WAIT$/ { TIME_WAIT++; }

                END {
                        printf "| %4d| %4d| %4d| %4d| %4d| %4d| %4d| %4d| %4d| %4d| %4d|\n",ESTABLISHED,LISTEN,TIME_WAIT,CLOSED,SYN_SENT,SYN_RECEIVED,CLOSE_WAIT,FIN_WAIT_1,FIN_WAIT_2,CLOSING,LAST_ACK;
                }'
        sleep 2
done
```

- 실행결과

```bash
bash netmon.sh
+--------+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
|  TIME  |ESTAB|LISTN|T_WAT|CLOSD|S_SEN|S_REC|C_WAT|F_WT1|F_WT2|CLOSI|L_ACK|
+--------+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+-----+
|18:28:27|    1|    3|    0|    0|    0|    0|    0|    0|    0|    0|    0|
|18:28:29|    1|    3|    0|    0|    0|    0|    0|    0|    0|    0|    0|
(이하 생략)
```

- 아래 스크립트를 통해 서버의 `LISTEN` 포트 별 커넥션 수 모니터링을 수행합니다.

```bash
#!/bin/bash

grep -v "rem_address" /proc/net/tcp  | awk 'function hextodec(str,ret,n,i,k,c){
    ret = 0
    n = length(str)
    for (i = 1; i <= n; i++) {
        c = tolower(substr(str, i, 1))
        k = index("123456789abcdef", c)
        ret = ret * 16 + k
    }
    return ret
} {x=hextodec(substr($2,index($2,":")-2,2)); for (i=5; i>0; i-=2) x = x"."hextodec(substr($2,i,2))}{print x":"hextodec(substr($2,index($2,":")+1,4))}' | sort | uniq -c | sort -rn
```

- 실행결과

```bash
bash connection-port.sh
      1 10.41.36.207:22
      1 0.0.0.0:22
```

# 6. 부하상황 확인

- 시스템에 구동중인 프로세스 및 상태 표시

  ```bash
  ionice -c 2 -n 7 nice -n 19 top -c
  ```

  - `-c`를 쓰면 프로세스 목록 창에 표시되는 프로세스 이름이 인자의 정보도 포함.
    - `top` 화면으로 이동한 다음 `1`을 입력하면 각 CPU 코어의 활용도를 개별적으로 볼 수 있습니다.
    - `E` (대소문자 구별)을 입력하면, 메모리 단위를 MiB, GiB 단위로
  - `us(user)`: OS의 유저에서 사용한 CPU 비율. 애플리케이션 이 얼마만큼 CPU를 사용하고 있는지에 대한 지표.
  - `sy(system)`: OS의 커널에서 사용한 CPU 비율. system 값이 높은 경우 OS의 자원(파일 디스크립터와 포트 등)을 가진 경우입니다. 커널 파라미터 튜닝에 의해 부하를 낮출 수 있습니다. `fork` 횟수가 많은 등 부하가 높은 시스템 호출을 응용 프로그램이 했을 가능성이 있고 `strace`를 통해 더 자세하게 조사할 수 있습니다.
  - `wa(iowait)`: 디스크 I/O에 사용된 CPU 비율. `iowait`가 높은 경우는 `iostat` 명령어를 통해 디스크 I/O 상황을 볼 수 있습니다.

  - 아래 표는 `top` 명령을 통해 볼 수 있는 지표들을 설명합니다:

    | PR        | NI             | VIRT        | RES         | SHR         | S    | %CPU       | %MEM          | TIME+     |
    | --------- | -------------- | ----------- | ----------- | ----------- | ---- | ---------- | ------------- | --------- |
    | 우선 순위 | 상대 우선 순위 | 가상 메모리 | 실제 메모리 | 공유 메모리 | 상태 | CPU 사용률 | 메모리 사용률 | 실행 시간 |

  - S: Process Status

    | 플래그 | 의미          |
    | ------ | ------------- |
    | `D`    | 인터럽트 불가 |
    | `R`    | 실행 중       |
    | `S`    | 잠            |
    | `T`    | 정지 중       |
    | `Z`    | 좀비 프로세스 |

- CPU 사용량, R/W에 대한 I/O량, 메모리 사용량

  ```bash
  sar -u 3 10

  # 만일 시스템에 sar가 설치되어 있지 않을 경우, 설치를 수행하여 확인합니다.
  apt-get install sysstat
  ```

  - `%user`: 사용자 영역에서의 CPU 사용률.
  - `%nice`: 우선 순위 변경된 프로세스를 통해 사용자 영역에서 CPU가 사용된 활용도.
  - `%system`: 커널 영역에서의 CPU 사용률.
  - `%iowiat`: 표시되는 경우 CPU가 I/O 작업을 기다리고 있었음을 나타내는데, 시간의 비율로 보여준다.
  - `%idle`: 디스크 I/O 대기에서 CPU가 기다리던 시간의 비율.

- CPU 사용률, 대기/차단된 프로세스 정보

  ```bash
  vmstat 1 10
  ```

  - `r`: CPU에서 실행 및 순서를 기다리고있는 프로세스의 수. `r`값이 CPU 수보다 많으면 포화 상태입니다.
  - `b`: 차단된 프로세스 수입니다.
  - `si, so`: 스왑과 스왑. 제로가 아닌 값이 있으면 메모리 부족을 의미합니다.
  - `us, sy, id, wa, st`: CPU 시간의 분석에서 모든 CPU에 대한 평균 값. 각 사용자 시간, 시스템(커널) 시간, 유휴, 대기 시간, I/O 지연, steal된 시간.

- 프로세스 당 상황

  - CPU 점유율 순으로 내림차순 정렬 후, 점유율이 높은 프로세스를 확인

  ```bash
  ps aux --sort=-%cpu
  ```

# 7. 도커 컨테이너 상황 확인

```shell
docker ps -a

# 이상있는 컨테이너 상황을 살펴보려고 할 때

# 컨테이너 로그 보기
docker logs -f $CONTAINER_NAME

# tail 파라미터를 이용하여 로그의 마지막부터 보기
docker logs -f --tail 100 $CONTAINER_NAME

# 컨테이너 내부 설정 등을 보기
docker inspect $CONTAINER_NAME
```

# 마무리

다시금 말씀드리지만, 이 글은 좋은 글을 가져와 제 입맛에 맞게 정리한 것에 불과합니다. 제 스스로 되새김질 하기 위해 썼기 때문에 하단의 참조링크를 꼭 일독하시기를 권해드립니다.

감사합니다.

---

# References

- https://brunch.co.kr/@daniellim/19
- https://www.mimul.com/blog/linux-server-operations/
- https://netflixtechblog.com/linux-performance-analysis-in-60-000-milliseconds-accc10403c55
