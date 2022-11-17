# README

[gatsby-starter-lumen](https://github.com/alxshelepenok/gatsby-starter-lumen)을 도로 들고오고, 이걸 멋대로 고칠 생각을 하기로 했다. 이유는 아래와 같다

- 카테고리, 태그 별 정렬이 가능하다
- 페이지네이션이 구현되어있다 (물론 1, 2, ,,, n 형식으로 짜고싶은데 이건 나중에)
- 리액트 배우고와서 좀 할 수 있겠다 싶다. 아주 조금이라, 맨땅에 부딪히면서 배워야한다...!

## Table of contents

- [Features](http://github.com/alxshelepenok/gatsby-starter-lumen#features)
- [Quick Start](http://github.com/alxshelepenok/gatsby-starter-lumen#quick-start)
- [Folder Structure](http://github.com/alxshelepenok/gatsby-starter-lumen#folder-structure)
- [Sponsors](http://github.com/alxshelepenok/gatsby-starter-lumen#sponsors)
- [Contributors](http://github.com/alxshelepenok/gatsby-starter-lumen#contributors)
- [License](http://github.com/alxshelepenok/gatsby-starter-lumen#license)

## Features

- Beautiful typography.
- Mobile first approach in development.
- Syntax highlighting in code blocks using PrismJS.
- Pagination support.

## Quick Start

```
$ npm install
$ npm run start
```

## Folder Structure

```
.
├── internal
│   ├── definitions
│   ├── gatsby
│   │   ├── constants
│   │   ├── queries
│   │   ├── types
│   │   └── utils
│   └── testing
│       └── __mocks__
└── src
    ├── assets
    │   └── scss
    │       ├── base
    │       └── mixins
    ├── components
    │   ├── Feed
    │   ├── Icon
    │   ├── Image
    │   ├── Layout
    │   ├── Page
    │   ├── Pagination
    │   ├── Post
    │   │   ├── Author
    │   │   ├── Comments
    │   │   ├── Content
    │   │   ├── Meta
    │   │   └── Tags
    │   └── Sidebar
    │       ├── Author
    │       ├── Contacts
    │       ├── Copyright
    │       └── Menu
    ├── constants
    ├── hooks
    ├── templates
    │   ├── CategoriesTemplate
    │   ├── CategoryTemplate
    │   ├── IndexTemplate
    │   ├── NotFoundTemplate
    │   ├── PageTemplate
    │   ├── PostTemplate
    │   ├── TagsTemplate
    │   └── TagTemplate
    ├── types
    └── utils
```

## License

The MIT License (MIT)

Copyright (c) 2016-2022 Alexander Shelepenok

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
