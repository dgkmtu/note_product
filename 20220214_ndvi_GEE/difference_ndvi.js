// NDVI用の表示パラメータの準備
var visParams_ndvi = {min: 0,
                      max: 1,
                      palette: [
                      'FFFFFF', 'CE7E45', 'DF923D', 'F1B555',
                      'FCD163', '99B718', '74A901', '66A000',
                      '529400', '3E8601', '207401', '056201',
                      '004C00', '023B01', '012E01', '011D01',
                      '011301'
                      ]};

// Sentinel-2用の表示パラメータ準備
var visualization = {
  min: 0.0,
  max: 3000.0,
  bands: ['B4_median', 'B3_median', 'B2_median'],
};

// 結果表示用の表示パラメータの準備
var visParams_diff = {min: 0,
                      max: 1,
                      palette:['FFFFFF', 'FF0000']};

// 静岡県熱海市の土砂災害地域の範囲
var area = ee.Geometry.Polygon(
    [
      [139.0686663244738, 35.11309186893834],
      [139.08754907593865, 35.11309186893834],
      [139.08754907593865, 35.12404406042147],
      [139.0686663244738, 35.12404406042147],
      [139.0686663244738, 35.11309186893834]
    ]
);

// 災害後の画像
var s2_after = ee.ImageCollection("COPERNICUS/S2").filterBounds(area)
                      .filterDate('2021-09-23', '2021-09-25')
                      .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'not_greater_than', 5);

// 災害前の画像
var s2_before = ee.ImageCollection("COPERNICUS/S2").filterBounds(area)
                      .filterDate('2021-05-01', '2021-05-03')
                      .filterMetadata("CLOUDY_PIXEL_PERCENTAGE","not_greater_than",5);

// ImageCollectionにおける各ピクセルを中央値で集約
var s2_after_cent = s2_after.reduce(ee.Reducer.median()).clip(area);
var s2_before_cent = s2_before.reduce(ee.Reducer.median()).clip(area);

// NDVIの算出
var s2_after_cent_ndvi = s2_after_cent.normalizedDifference(['B8_median', 'B4_median']);
var s2_before_cent_ndvi = s2_before_cent.normalizedDifference(['B8_median', 'B4_median']);

// 災害後のNDVIから災害前のNDVIを引く
var diff_ndvi = s2_after_cent_ndvi.subtract(s2_before_cent_ndvi);

// 差分データの標準偏差を計算
var diff_ndvi_sd = ee.Number(
  diff_ndvi.reduceRegion({
    reducer: ee.Reducer.stdDev(),
    geometry: area,
    scale: 10
  }).get('nd')
);

// 差分データの算術平均を計算する
var diff_ndvi_mean = ee.Number(
  diff_ndvi.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: area,
    scale: 10
  }).get('nd')
);

// 平均から標準偏差の2倍値を引く(-2σ)
var thresh = diff_ndvi_mean.subtract(diff_ndvi_sd.multiply(2));

// 計算されたしきい値を使ってNDVIの差分画像を2値化する
var result = diff_ndvi.lt(thresh);

// 分析範囲にズームする
Map.centerObject(area)

// レイヤに画像を追加する
Map.addLayer(s2_after_cent, visualization, 'sentinel2_after');
Map.addLayer(s2_after_cent_ndvi, visParams_ndvi, 'NDVI_After');
Map.addLayer(s2_before_cent, visualization, 'sentinel2_before');
Map.addLayer(s2_before_cent_ndvi, visParams_ndvi, 'NDVI_Before');
Map.addLayer(result, visParams_diff, 'Subtruct');