<?php
// Мини-прокси для anime365 API (у апстрима нет CORS-заголовков).
// Только GET, только пути /api/*, хост зашит — ничего другого не проксирует.

$path = isset($_GET['path']) ? $_GET['path'] : '';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit;
}
if (!preg_match('#^/api/[A-Za-z0-9/_\-.?&=%,+]*$#', $path) || strpos($path, '..') !== false) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":"bad path"}';
    exit;
}

$url = 'https://smotret-anime.online' . $path;

$ch = curl_init($url);
curl_setopt_array($ch, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 3,
    CURLOPT_USERAGENT      => 'RYOTAMORI/1.0 (+https://ryotamori.ru)',
    CURLOPT_ACCEPT_ENCODING => '',
));
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: public, max-age=300');
http_response_code($body === false || $code === 0 ? 502 : $code);
echo $body === false ? '{"error":"upstream unavailable"}' : $body;
