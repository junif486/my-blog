---
title: 깃과 깃허브
date: 2026-08-11
tags: 개발, Git
---

깃(Git)과 깃허브(GitHub)는 이름이 비슷해서 헷갈리기 쉽지만 서로 다른 역할을 한다.

## Git — 버전 관리 도구

Git은 파일의 변경 이력을 추적하는 **버전 관리 시스템**이다. 내 컴퓨터 안에서 동작하며, 인터넷 연결 없이도 쓸 수 있다.

```bash
git init                 # 저장소 초기화
git add file.txt         # 변경사항을 스테이징
git commit -m "message"  # 커밋(스냅샷) 생성
git log                  # 커밋 이력 확인
```

핵심은 **커밋**이다. 커밋은 "이 시점의 파일 상태"를 저장한 스냅샷이고, 언제든 특정 커밋으로 되돌아가거나 비교할 수 있다.

## GitHub — Git 저장소를 위한 호스팅 서비스

GitHub는 Git 저장소를 인터넷에 올려두고 여러 사람과 공유·협업할 수 있게 해주는 **웹 서비스**다. Git 자체와는 별개이며, GitLab이나 Bitbucket 같은 비슷한 서비스도 있다.

```bash
git remote add origin https://github.com/user/repo.git
git push -u origin main   # 로컬 커밋을 GitHub로 업로드
git pull                  # GitHub의 최신 내용을 내려받기
```

## 기본 협업 흐름

1. 저장소를 `git clone`으로 내려받는다.
2. 새 기능은 별도 브랜치(`git checkout -b feature-x`)에서 작업한다.
3. 작업이 끝나면 커밋하고 GitHub에 `push`한다.
4. GitHub에서 **Pull Request**를 열어 변경사항을 리뷰받는다.
5. 승인되면 `main` 브랜치에 **merge**한다.

> 정리하면, Git은 "버전을 관리하는 방법"이고 GitHub는 "그 버전을 저장·공유하는 곳"이다.
