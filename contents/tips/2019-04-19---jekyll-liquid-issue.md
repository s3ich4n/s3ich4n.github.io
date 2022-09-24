---
title: "Django 코드를 Jekyll에 작성할 때 Liquid syntax error가 뜬다면?"
date: "2019-04-19T12:00:00.000Z"
template: "post"
draft: false
slug: "docker-explained-pt02"
category: "tips"
tags: 
  - "tips"
  - "jekyll"
description: "Python 코드를 Jekyll에 작성 시, Liquid syntax error가 뜬다면?"
---

# Liquid syntax error (line 26): Unknown tag 'url' ?

Django의 템플릿 문법이 Jekyll의 [liquid](https://jekyllrb.com/docs/liquid/)와 같아서 루비 문법으로 해석하다보니 충돌이 발생한다. 해결책은 아래와 같다:


{% raw %}{%{% endraw %} raw %}
{% raw %}```
<a href="{% url 'social:begin' 'oauth2-provider-name' %}">Login</a>
```{%{% endraw %} endraw %}

## References:

[jekyll issue #4569](https://github.com/jekyll/jekyll/issues/4569)
