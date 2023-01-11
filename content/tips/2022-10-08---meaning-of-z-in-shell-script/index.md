---
title: "Bash 스크립트의 문자열 비교에 대해 알아봅시다"
date: "2022-10-08T19:30:00.000Z"
template: "post"
draft: false
slug: "/tips/2022-10-08-meaning-of-z-in-shell-script"
category: "tips"
tags:
  - "linux"
  - "shell"
description: "Bash 스크립트를 작성하며 -z 라는 키워드에 대해 알게되었습니다. 더 나아가 쉘 스크립트에선 문자열을 어떻게 다루는지 살펴봅시다."
socialImage: { "publicURL": "./media/snow.jpg" }
---

# 문자열 비교

이전 회사에서 근무 중, Bash 스크립트를 작성할 일이 있었습니다. 그 때 Bash 스크립트에서 문자열을 다루는 오퍼레이터에 대해 살펴보았던 기억이 있어 이를 글로 남기고 공유하고자 합니다.

## 들어가기에 앞서..

### Bash 스크립트에서의 `if-then` 구문

논리적 참/거짓을 다루어 분기하기 위한 구문입니다. 으레 있는 구분이지요. 어셈블리어부터 현대 언어까지 다 있습니다.

그런데 if 구문에서 참/거짓을 다루는 것은 바이너리입니다. `/usr/bin/test` 라는 바이너리를 사용하죠. 이러한 이유로 Test constructs 라고 부르는 것으로 보입니다.

```bash
#!/bin/bash

# 1st cmd) test를 직접 사용하는 경우
if test -z "$1"
then
  echo "no args"
else
  echo "1st args: $1"
fi

# 2nd cmd) test의 fullpath를 직접 사용하는 경우
if /usr/bin/test -z "$1"
then
    echo "no args"
else
    echo "1st args: $1"
fi

# 3rd cmd) bracket 내에 조건문을 담는 경우
if [ -z "$1" ]
then
  echo "no args"
else
  echo "1st args: $1"
fi

# 4th cmd) /usr/bin/[if 구문을 사용]
# 3rd와 동일

if /usr/bin/[ -z "$1" ]
then
  echo "no args"
else
  echo "1st args: $1"
fi
```

## 문자열의 동일여부 체크

- `=`
  - 값이 같은가?
  - `if [ "$a" = "$b" ]` 과 같이 사용합니다. 띄어쓰기가 반드시 필요합니다!!!
- `==`
  - 값이 같은가?
  - `if [ "$a" == "$b" ]` 과 같이 사용합니다. `==` 비교는 double-brackets에서는 전혀 다르게 동작할 수 있음에 유의하십시오.
- `!=`
  - 값이 같지 않은가?
  - `if [ "$a" != "$b" ]` 과 같이 사용합니다.

## 문자열의 사전 순서 체크

- `<`
  - 값이 작은가 (ASCII 알파벳 순)
  - `if [[ "$a" < "$b" ]]` 혹은 `if [ "$a" \< "$b" ]` 과 같이 사용합니다.
- `>`
  - 값이 큰가? (ASCII 알파벳 순)
  - `if [[ "$a" > "$b" ]]` 혹은 `if [[ "$a" \> "$b" ]]` 과 같이 사용합니다.

## 문자열의 null 여부 체크

- `-z`
  - 문자열이 `null`인지를 묻는 구문입니다. 다시말해, 문자열의 길이가 `0`인지 묻는 것과 동일합니다.
- `-n`
  - 문자열이 null이 아니고, 길이가 `0`이 아닌지를 **함께** 묻습니다.
  - `if [ -n "${1}" ]` 과 같이 사용합니다.
  - 이 때, 예기치 않은 동작을 방지하려면 문자열을 항상 `"`로 감싸서 사용합니다.

예를들어, 아래의 코드가 있다고 칩시다:

```bash
#!/bin/bash

# 이 값을 직접 바꾸며 테스트하면 됩니다!
abc='abc'

echo "step 1"
if [[ -z "$abc" ]]
then
    echo "[1] empty string"
else
    echo "[1] string is not null: $abc"
fi

echo "step 2"
if [[ -n "$abc" ]]
then
    echo "[2] string is not null: $abc"
else
    echo "[2] empty string"
fi
```

## 오잉?

### single-brackets and double-brackets

> [참고경로](https://tldp.org/LDP/abs/html/testconstructs.html#DBLBRACKETS)를 읽어주세요!

Bash 2.02 버전(1998년에 릴리즈 되었습니다!) 부터 if 구문에서 double bracket 사용할 수 있게 되었습니다. 논리구문 처리에 있어서 보다 작성된 의도대로 돌게끔 해석합니다. IMHO, 잘 모르겠다면 double brackets을 사용하는게 좋을 듯 하네요.

### 하나 더!

스크립트 작성 시 Regex를 쓸 때는 이른바 "교환법칙"이 성립하지 않습니다. 왜 그런지는 아래 설명을 함께 보시죠:

> When the ‘==’ and ‘!=’ operators are used, the string to the right of the operator is considered a pattern and matched according to the rules described below in [Pattern Matching](https://www.gnu.org/software/bash/manual/html_node/Pattern-Matching.html), as if the extglob shell option were enabled. The ‘=’ operator is identical to ‘==’. If the nocasematch shell option (see the description of shopt in [The Shopt Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Shopt-Builtin.html)) is enabled, the match is performed without regard to the case of alphabetic characters. The return value is 0 if the string matches (‘==’) or does not match (‘!=’) the pattern, and 1 otherwise.
>
> '==' 및 '!=' 연산자를 사용하면 연산자 오른쪽의 문자열이 패턴으로 간주되어 마치 extglob 셸 옵션이 활성화된 것처럼 패턴 일치에서 설명하는 규칙에 따라 일치됩니다. '=' 연산자는 '=='와 동일합니다. nocasematch 셸 옵션(The Shopt Builtin의 shopt 설명 참조)이 활성화되면 알파벳 대소문자 구분 없이 일치가 수행됩니다. 문자열이 패턴과 일치('==')하거나 일치하지 않으면('!=') 반환 값은 0이고 그렇지 않으면 1입니다. 인용된 부분이 문자열로 일치하도록 강제하기 위해 패턴의 일부를 인용할 수 있습니다.

## 마무리

공부하면 공부할 수록 더 정확히 알아야겠다는 것은 변함이 없습니다. 추후에도 Bash 스크립트를 더 봐야한다면, 공식 문서를 자주 살펴봐야겠군요.

---

- 참고링크
  - [tldp.org의 배시 스크립트 강의 중](https://tldp.org/LDP/abs/html/comparison-ops.html)
  - [extended-test의 패턴 매칭관련](https://systemoverlord.com/2017/04/17/bash-extended-test-pattern-matching.html)
