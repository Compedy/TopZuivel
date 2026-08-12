// Paths that no legitimate visitor of this app would ever request.
// They mimic common WordPress/PHP/infra admin & secrets endpoints that
// automated scanners probe by default. Any hit is treated as malicious.
const HONEYPOT_EXACT_PATHS = new Set([
    '/wp-login.php',
    '/xmlrpc.php',
    '/wp-config.php',
    '/config.php',
    '/admin.php',
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.git/config',
    '/.git/HEAD',
    '/.aws/credentials',
    '/.ssh/id_rsa',
    '/server-status',
    '/vendor/phpunit/phpunit/src/Util/PHP/eval-stdin.php',
    '/actuator/env',
    '/_profiler/phpinfo',
])

const HONEYPOT_PATH_PREFIXES = [
    '/wp-admin',
    '/wp-content',
    '/wp-includes',
    '/phpmyadmin',
    '/pma',
    '/administrator',
    '/.git/',
    '/.aws/',
    '/.ssh/',
    '/telescope',
]

export function isHoneypotPath(pathname: string): boolean {
    const normalized = pathname.toLowerCase()

    if (HONEYPOT_EXACT_PATHS.has(normalized)) {
        return true
    }

    return HONEYPOT_PATH_PREFIXES.some(prefix => normalized.startsWith(prefix))
}
