import { configure } from '@testing-library/react-native';

// CI 러너는 로컬보다 파일당 약 10배 느려 첫 렌더(expo-router 라우트 로드)가 기본 대기(findBy 1초, 테스트 5초)를 넘긴다.
// 검증 내용은 그대로 두고 대기 상한만 늘린다(테스트 상한은 package.json jest.testTimeout).
configure({ asyncUtilTimeout: 5000 });
