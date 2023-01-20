---
title: "PyCharm에서 파일 맨 위에 작성하는 주석을 작성하는 매크로 만들기"
date: "2021-06-03T09:00:00.000Z"
template: "post"
draft: false
slug: "/tips/how-to-use-file-signature-in-pycharm"
category: "tips"
tags:
  - "pycharm"
description: "매일 입력하는 파일 설명(시그니처)을 귀찮지 않게 커맨드 하나로 자동입력되게 하는 방안을 찾았습니다. 회사 팀원들과 주변사람들에게만 공유하기는 아까워서 짧은 글을 써봤습니다."
socialImage: { "publicURL": "./media/pangyo_01.jpg" }
---

PyCharm에서 파일 시그니처를 바로 입력하려면?

`Live Templates` 기능을 사용하면 보다 손쉽게 사용할 수 있다.

1. shift 두번 눌러서 액션을 열고 `Live Templates` 를 연다.
2. add를 하되, 파이썬 파일에서만 쓸거니까 파이썬에서 기능을 혀용하도록 한다.
3. 이런 식으로 시그니처를 작성한다.

   ```json
   #
   # (코드의 전반적인 내용을 설명해 주세요)
   #
   # @author      Seongeun Yu (seongeun.yu@somma.kr)
   # @date        $DATE$ $TIME$ created.
   # @modified    $DATE$ $TIME$ modified.
   # @copyright   MIT License
   #
   ```

   1. 변수를 저렇게 두면 원하는 함수를 써서 매핑할 수 있다.

4. `$DATE$`, `$TIME$` 값은 함수를 쓰면 된다. 관련 참고링크는 [여기](https://www.jetbrains.com/help/pycharm/template-variables.html#predefined_functions):
   1. `date()` 함수의 파라미터 규격은 자바의 ([SimpleDateFormat](https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html))을 따라간다.
   2. date, time의 규격은 이렇게 하면 된다.
      1. date는? `date("yyyy/MM/dd")`
      2. time은? `date("HH:mm")`
5. 파일을 열 때마다 `sign_s3ich4n` 를 한두글자만 치면 자동완성으로 알아서 완성된다.
