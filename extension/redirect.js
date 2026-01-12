// 여기에 배포된 Vercel 주소를 입력해주세요.
const LAUNCH_DOCK_URL = "https://launch-dock.vercel.app";

if (LAUNCH_DOCK_URL === "YOUR_VERCEL_APP_URL_HERE") {
    document.body.innerHTML = "<h1>설정이 필요합니다.</h1><p>extension/redirect.js 파일을 열어 LAUNCH_DOCK_URL에 배포된 주소를 입력해주세요.</p>";
} else {
    window.location.href = LAUNCH_DOCK_URL;
}
