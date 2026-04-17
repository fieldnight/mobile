export function buildMapHtml(apiKey: string = ''): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    #error {
      position: absolute; inset: 0; display: none;
      flex-direction: column; align-items: center; justify-content: center;
      background: #fff; z-index: 999; font-family: sans-serif; padding: 24px; text-align: center;
    }
    #error p { color: #e53e3e; font-size: 14px; margin-bottom: 8px; }
    #error small { color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div id="error">
    <p>지도를 불러올 수 없습니다.</p>
    <small id="error-msg"></small>
  </div>
  <div id="map"></div>

  <script type="text/javascript" src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"></script>
  <script>
    function showError(msg) {
      var el = document.getElementById('error');
      el.style.display = 'flex';
      document.getElementById('error-msg').textContent = msg || '';
    }

    function initMap() {
      var container = document.getElementById('map');
      new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(35.8714, 128.6014),
        level: 13,
      });
    }

    function loadKakaoMap() {
      if (window.kakao && window.kakao.maps) {
        kakao.maps.load(initMap);
      } else {
        showError('카카오맵 객체를 찾을 수 없습니다. 키를 확인해주세요.');
      }
    }

    loadKakaoMap();
  </script>
</body>
</html>`;
}
