export function buildMapHtml(apiKey: string = ""): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #eef6ff; }
    #map { width: 100%; height: 100%; }
    #error {
      position: absolute; inset: 0; display: none;
      flex-direction: column; align-items: center; justify-content: center;
      background: #fff; z-index: 999; font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; text-align: center;
    }
    #error p { color: #e53e3e; font-size: 14px; margin-bottom: 8px; }
    #error small { color: #999; font-size: 12px; }
    .marker {
      width: 42px; height: 42px; border: 0; border-radius: 999px;
      color: #fff; font-size: 14px; font-weight: 800;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.24);
      transform: translateY(-6px);
    }
    .marker-seller { background: #0ea5e9; }
    .marker-farm { background: #f97316; }
    .marker.is-selected {
      outline: 4px solid rgba(255, 255, 255, 0.9);
      box-shadow: 0 16px 28px rgba(15, 23, 42, 0.32);
      transform: translateY(-8px) scale(1.08);
    }
    .marker-tail {
      position: absolute; left: 50%; bottom: -6px;
      width: 14px; height: 14px; transform: translateX(-50%) rotate(45deg);
      border-radius: 3px;
    }
    .marker-seller .marker-tail { background: #0ea5e9; }
    .marker-farm .marker-tail { background: #f97316; }
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
    var map = null;
    var overlays = [];
    var ready = false;
    var pendingPayload = null;
    var defaultCenter = { lat: 35.836, lng: 128.754 };

    function sendToApp(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }

    function showError(msg) {
      var el = document.getElementById('error');
      el.style.display = 'flex';
      document.getElementById('error-msg').textContent = msg || '';
      sendToApp({ type: 'mapError', message: msg || '' });
    }

    function clearOverlays() {
      overlays.forEach(function(overlay) { overlay.setMap(null); });
      overlays = [];
    }

    function createMarker(place, selectedId) {
      var content = document.createElement('button');
      var selected = selectedId === place.id;
      var label = place.kind === 'farm' ? '농' : '업';
      content.type = 'button';
      content.className = 'marker marker-' + place.kind + (selected ? ' is-selected' : '');
      content.innerHTML = '<span>' + label + '</span><span class="marker-tail"></span>';
      content.addEventListener('click', function() {
        sendToApp({ type: 'markerPress', id: place.id });
      });

      return new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(place.lat, place.lng),
        content: content,
        yAnchor: 1.15,
      });
    }

    function fitPlaces(places) {
      if (!places.length) {
        map.setCenter(new kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng));
        map.setLevel(8);
        return;
      }

      if (places.length === 1) {
        map.setCenter(new kakao.maps.LatLng(places[0].lat, places[0].lng));
        map.setLevel(5);
        return;
      }

      var bounds = new kakao.maps.LatLngBounds();
      places.forEach(function(place) {
        bounds.extend(new kakao.maps.LatLng(place.lat, place.lng));
      });
      map.setBounds(bounds, 48, 48, 48, 48);
    }

    function renderPlaces(payload) {
      if (!ready || !map) {
        pendingPayload = payload;
        return;
      }

      var places = Array.isArray(payload.places) ? payload.places : [];
      clearOverlays();
      places.forEach(function(place) {
        if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return;
        var overlay = createMarker(place, payload.selectedId);
        overlay.setMap(map);
        overlays.push(overlay);
      });
      fitPlaces(places);
    }

    function receiveMessage(event) {
      try {
        var payload = JSON.parse(event.data);
        if (payload.type === 'setPlaces') renderPlaces(payload);
      } catch (error) {
        showError('지도 데이터를 처리하지 못했습니다.');
      }
    }

    document.addEventListener('message', receiveMessage);
    window.addEventListener('message', receiveMessage);

    function initMap() {
      var container = document.getElementById('map');
      map = new kakao.maps.Map(container, {
        center: new kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
        level: 8,
      });
      ready = true;
      sendToApp({ type: 'mapReady' });
      if (pendingPayload) renderPlaces(pendingPayload);
    }

    function loadKakaoMap() {
      if (!'${apiKey}') {
        showError('카카오 지도 키가 없습니다.');
        return;
      }

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
