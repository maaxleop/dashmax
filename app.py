import os
import json
import time
import socket
import http.client
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import psutil
import threading
import concurrent.futures
from functools import wraps
from flask import Flask, jsonify, request, send_from_directory, session

class UnixHTTPConnection(http.client.HTTPConnection):
    def __init__(self, socket_path):
        super().__init__('localhost')
        self.socket_path = socket_path

    def connect(self):
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.sock.connect(self.socket_path)

app = Flask(__name__, static_folder='static', static_url_path='')
app.secret_key = os.environ.get('SECRET_KEY', 'dashmax-secret-key-change-me')

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config.json')

DEFAULT_CONFIG = {
    "auth": {
        "enabled": True,
        "user": "admin",
        "password": "admin"
    },
    "categories": []
}

def load_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if data:
                    return data
        except Exception as e:
            print(f"Error reading config.json: {e}")
    save_config(DEFAULT_CONFIG)
    return DEFAULT_CONFIG

def save_config(data):
    try:
        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving config.json: {e}")
        return False

def check_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        config = load_config()
        auth_cfg = config.get('auth', {})
        enabled = auth_cfg.get('enabled', False)
        password = auth_cfg.get('password', '').strip()
        if enabled and password:
            if not session.get('authenticated'):
                return jsonify({'error': 'Unauthorized', 'auth_required': True}), 401
        return f(*args, **kwargs)
    return decorated

@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@app.route('/apple-touch-icon.png')
@app.route('/apple-touch-icon-precomposed.png')
@app.route('/favicon.ico')
def serve_apple_touch_icon():
    return send_from_directory('static', 'apple-touch-icon.png', mimetype='image/png')

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/json')

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    config = load_config()
    auth_cfg = config.get('auth', {})
    password = auth_cfg.get('password', '').strip()
    enabled = auth_cfg.get('enabled', False) and bool(password)
    is_auth = session.get('authenticated', False) if enabled else True
    return jsonify({
        'auth_enabled': enabled,
        'authenticated': is_auth,
        'username': session.get('username', auth_cfg.get('user', 'admin'))
    })

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.json or {}
    user_input = data.get('username', '').strip()
    pass_input = data.get('password', '').strip()
    
    config = load_config()
    auth_cfg = config.get('auth', {})
    valid_user = auth_cfg.get('user', 'admin')
    valid_pass = auth_cfg.get('password', 'admin')
    
    if user_input == valid_user and pass_input == valid_pass:
        session['authenticated'] = True
        session['username'] = valid_user
        return jsonify({'status': 'success', 'authenticated': True})
    
    return jsonify({'status': 'error', 'message': 'Identifiants incorrects'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.clear()
    return jsonify({'status': 'success', 'authenticated': False})

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    config = load_config()
    auth_cfg = config.get('auth', {})
    if auth_cfg.get('enabled', True) and request.method == 'POST':
        if not session.get('authenticated'):
            return jsonify({'error': 'Unauthorized'}), 401
            
    if request.method == 'POST':
        new_data = request.json
        if not new_data:
            return jsonify({'error': 'Invalid JSON'}), 400
        if save_config(new_data):
            return jsonify({'status': 'success', 'config': new_data})
        return jsonify({'error': 'Failed to write configuration'}), 500
    
    # Hide password when returning public config
    cfg_copy = json.loads(json.dumps(config))
    if 'auth' in cfg_copy and 'password' in cfg_copy['auth']:
        del cfg_copy['auth']['password']
    return jsonify(cfg_copy)

@app.route('/api/system', methods=['GET'])
@check_auth
def get_system_metrics():
    global last_net_io, last_net_time
    
    current_time = time.time()
    elapsed = max(current_time - last_net_time, 0.1)
    
    # CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    cpu_cores = psutil.cpu_percent(interval=None, percpu=True)
    
    # RAM
    memory = psutil.virtual_memory()
    
    # Disk (Target RAID / Volume)
    target_storage = os.environ.get('STORAGE_PATH', '/volume3')
    disk_path = '/'
    for candidate in [target_storage, '/volume3', '/volume1', os.getcwd(), '/']:
        if os.path.exists(candidate):
            disk_path = candidate
            break
            
    try:
        disk = psutil.disk_usage(disk_path)
    except Exception:
        disk = psutil.disk_usage('/')
    
    # Network IO Speed
    current_net_io = psutil.net_io_counters()
    bytes_sent_per_sec = (current_net_io.bytes_sent - last_net_io.bytes_sent) / elapsed
    bytes_recv_per_sec = (current_net_io.bytes_recv - last_net_io.bytes_recv) / elapsed
    
    last_net_io = current_net_io
    last_net_time = current_time
    
    # Uptime
    boot_time = psutil.boot_time()
    uptime_seconds = int(current_time - boot_time)
    
    return jsonify({
        'timestamp': current_time,
        'cpu': {
            'usage_percent': cpu_percent,
            'cores': cpu_cores,
            'count': psutil.cpu_count(logical=True)
        },
        'memory': {
            'total_gb': round(memory.total / (1024 ** 3), 2),
            'used_gb': round(memory.used / (1024 ** 3), 2),
            'free_gb': round(memory.available / (1024 ** 3), 2),
            'usage_percent': memory.percent
        },
        'disk': {
            'total_gb': round(disk.total / (1024 ** 3), 2),
            'used_gb': round(disk.used / (1024 ** 3), 2),
            'free_gb': round(disk.free / (1024 ** 3), 2),
            'usage_percent': disk.percent
        },
        'network': {
            'upload_speed_mbps': round((bytes_sent_per_sec * 8) / 1_000_000, 2),
            'download_speed_mbps': round((bytes_recv_per_sec * 8) / 1_000_000, 2),
            'sent_mbytes': round(current_net_io.bytes_sent / (1024 * 1024), 1),
            'recv_mbytes': round(current_net_io.bytes_recv / (1024 * 1024), 1)
        },
        'uptime': {
            'seconds': uptime_seconds,
            'formatted': f"{uptime_seconds // 86400}d {(uptime_seconds % 86400) // 3600}h {(uptime_seconds % 3600) // 60}m"
        }
    })

@app.route('/api/ping', methods=['POST'])
@check_auth
def ping_services():
    data = request.json or {}
    urls = data.get('urls', [])
    results = {}
    
    headers = {
        'User-Agent': 'DashMax-Status-Checker/1.0'
    }
    
    for item in urls:
        target_id = item.get('id')
        target_url = item.get('url')
        if not target_id or not target_url:
            continue
            
        start_time = time.time()
        try:
            resp = requests.get(target_url, headers=headers, timeout=2.5, verify=False)
            latency_ms = int((time.time() - start_time) * 1000)
            results[target_id] = {
                'online': resp.status_code < 500,
                'status_code': resp.status_code,
                'latency_ms': latency_ms
            }
        except requests.exceptions.RequestException as e:
            results[target_id] = {
                'online': False,
                'status_code': 0,
                'latency_ms': 0,
                'error': str(e)
            }
            
    return jsonify(results)

@app.route('/api/weather', methods=['GET'])
def get_weather():
    config = load_config()
    settings = config.get('settings', {})
    city = settings.get('weatherCity', 'Brest,fr')
    api_key = settings.get('weatherApiKey', '9a98bf7256b1b400816a38e425918e44')
    
    url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric&lang=fr"
    try:
        resp = requests.get(url, timeout=3.0)
        if resp.status_code == 200:
            data = resp.json()
            return jsonify({
                'success': True,
                'city': data.get('name', 'Brest'),
                'temp': round(data['main']['temp']),
                'feels_like': round(data['main']['feels_like']),
                'description': data['weather'][0]['description'].capitalize(),
                'icon': data['weather'][0]['icon'],
                'humidity': data['main']['humidity'],
                'wind_speed': round(data['wind']['speed'] * 3.6)
            })
    except Exception as e:
        print(f"Weather API error: {e}")
        
    return jsonify({'success': False, 'city': 'Brest', 'temp': 18, 'description': 'Ensoleillé', 'icon': '01d'})

def get_docker_connection():
    if hasattr(socket, 'AF_UNIX'):
        for s_path in ['/var/run/docker.sock', '/run/docker.sock']:
            if os.path.exists(s_path):
                try:
                    return UnixHTTPConnection(s_path), s_path
                except Exception:
                    pass

    tcp_endpoints = []
    d_host = os.environ.get('DOCKER_HOST', '')
    if d_host.startswith('tcp://'):
        tcp_endpoints.append(d_host.replace('tcp://', '').split('/')[0])
    tcp_endpoints.extend(['127.0.0.1:2375', 'localhost:2375'])

    for ep in tcp_endpoints:
        try:
            h, p = ep.split(':')
            test_conn = http.client.HTTPConnection(h, int(p), timeout=2)
            test_conn.request('GET', '/_ping')
            resp = test_conn.getresponse()
            resp.read()
            test_conn.close()
            if resp.status == 200:
                return http.client.HTTPConnection(h, int(p), timeout=5), ep
        except Exception:
            pass

    return None, None

def _fetch_container_mem(container_id):
    conn, source = get_docker_connection()
    if not conn:
        return '-'
    try:
        conn.request('GET', f'/containers/{container_id}/stats?stream=false')
        resp = conn.getresponse()
        if resp.status == 200:
            data = json.loads(resp.read().decode('utf-8'))
            mem_stats = data.get('memory_stats', {})
            usage = mem_stats.get('usage', 0)
            stats = mem_stats.get('stats', {})
            cache = stats.get('cache', 0) or stats.get('inactive_file', 0)
            real_usage = max(0, usage - cache)
            if real_usage > 0:
                mb = real_usage / (1024 * 1024)
                if mb >= 1024:
                    return f"{mb / 1024:.2f} GB"
                return f"{mb:.1f} MB"
            elif usage > 0:
                mb = usage / (1024 * 1024)
                return f"{mb:.1f} MB"
        return '-'
    except Exception:
        return '-'
    finally:
        try:
            conn.close()
        except Exception:
            pass

@app.route('/api/containers', methods=['GET'])
@check_auth
def get_docker_containers():
    containers = []
    conn, source = get_docker_connection()
    
    if conn:
        try:
            conn.request('GET', '/containers/json?all=1')
            resp = conn.getresponse()
            if resp.status == 200:
                raw_data = json.loads(resp.read().decode('utf-8'))
                for c in raw_data:
                    name = c.get('Names', ['/inconnu'])[0].lstrip('/')
                    image = c.get('Image', '')
                    status = c.get('Status', '')
                    state = c.get('State', 'unknown')
                    labels = c.get('Labels', {}) or {}
                    project = labels.get('com.docker.compose.project', '')
                    service_name = labels.get('com.docker.compose.service', '')
                    config_file = labels.get('com.docker.compose.project.config_files', '') or labels.get('com.docker.compose.project.working_dir', '')
                    ports = []
                    for p in c.get('Ports', []):
                        if 'PublicPort' in p:
                            ports.append(f"{p['PublicPort']}:{p['PrivatePort']}")
                    containers.append({
                        'id': c.get('Id', '')[:12],
                        'name': name,
                        'image': image,
                        'state': state,
                        'status': status,
                        'ports': ', '.join(ports) if ports else '-',
                        'project': project,
                        'compose_service': service_name,
                        'config_file': config_file,
                        'memory': '-'
                    })
        except Exception as e:
            print(f"Error querying docker socket: {e}")
        finally:
            try:
                conn.close()
            except Exception:
                pass

        # Parallel fetch memory stats for running containers
        running_containers = [c for c in containers if c['state'] == 'running']
        if running_containers:
            with concurrent.futures.ThreadPoolExecutor(max_workers=min(8, len(running_containers))) as executor:
                future_to_c = {executor.submit(_fetch_container_mem, c['id']): c for c in running_containers}
                for future in concurrent.futures.as_completed(future_to_c):
                    c = future_to_c[future]
                    try:
                        c['memory'] = future.result()
                    except Exception:
                        c['memory'] = '-'

    return jsonify({
        'success': True, 
        'containers': containers, 
        'count': len(containers),
        'docker_available': conn is not None,
        'source': source or 'Inaccessible'
    })

def _exec_docker_post_action_thread(container_id, action):
    conn, source = get_docker_connection()
    if not conn:
        return
    try:
        conn.request('POST', f'/containers/{container_id}/{action}?t=5')
        resp = conn.getresponse()
        resp.read()
    except Exception as e:
        print(f"Error in async docker action ({action} on {container_id}): {e}")
    finally:
        try:
            conn.close()
        except Exception:
            pass

def _exec_project_action_thread(project_name, action):
    conn, source = get_docker_connection()
    if not conn:
        return
    try:
        conn.request('GET', '/containers/json?all=1')
        resp = conn.getresponse()
        if resp.status == 200:
            raw_data = json.loads(resp.read().decode('utf-8'))
            conn.close()
            target_ids = []
            for c in raw_data:
                labels = c.get('Labels', {}) or {}
                p_name = labels.get('com.docker.compose.project', '')
                if not p_name and project_name == 'Autonomes':
                    target_ids.append(c.get('Id', ''))
                elif p_name.lower() == project_name.lower():
                    target_ids.append(c.get('Id', ''))
            
            for c_id in target_ids:
                if c_id:
                    _exec_docker_post_action_thread(c_id, action)
                    time.sleep(0.15)
    except Exception as e:
        print(f"Error in project action ({action} on {project_name}): {e}")

@app.route('/api/projects/<path:project_name>/action', methods=['POST'])
@check_auth
def project_action(project_name):
    data = request.json or {}
    action = data.get('action', '').lower().strip()
    if action not in ('start', 'stop', 'restart', 'kill'):
        return jsonify({'success': False, 'error': f"Action non valide: {action}"}), 400

    conn, source = get_docker_connection()
    if not conn:
        return jsonify({'success': False, 'error': "Socket Docker non disponible sur le serveur"}), 400
    try:
        conn.close()
    except Exception:
        pass

    threading.Thread(target=_exec_project_action_thread, args=(project_name, action), daemon=True).start()
    return jsonify({'success': True, 'message': f"Ordre de {action} envoyé pour le projet {project_name}."})

@app.route('/api/containers/<container_id>/action', methods=['POST'])
@check_auth
def container_action(container_id):
    data = request.json or {}
    action = data.get('action', '').lower().strip()
    if action not in ('start', 'stop', 'restart', 'kill'):
        return jsonify({'success': False, 'error': f"Action non valide: {action}"}), 400

    conn, source = get_docker_connection()
    if not conn:
        return jsonify({'success': False, 'error': "Socket Docker non disponible sur le serveur"}), 400
    try:
        conn.close()
    except Exception:
        pass

    # Execute Docker action in background thread to avoid Reverse Proxy 502 HTTP timeouts
    threading.Thread(target=_exec_docker_post_action_thread, args=(container_id, action), daemon=True).start()

    return jsonify({'success': True, 'message': f"Ordre de {action} envoyé au conteneur."})

def docker_get_logs(container_id, tail=300):
    conn, source = get_docker_connection()
    if not conn:
        return False, "Socket Docker non disponible"
    try:
        conn.request('GET', f'/containers/{container_id}/logs?stdout=1&stderr=1&tail={tail}&timestamps=0')
        resp = conn.getresponse()
        raw = resp.read()
        if resp.status == 200:
            lines = []
            idx = 0
            while idx < len(raw):
                if idx + 8 <= len(raw):
                    size = int.from_bytes(raw[idx+4:idx+8], byteorder='big')
                    payload = raw[idx+8 : idx+8+size]
                    lines.append(payload.decode('utf-8', errors='replace'))
                    idx += 8 + size
                else:
                    lines.append(raw[idx:].decode('utf-8', errors='replace'))
                    break
            clean_logs = ''.join(lines) if lines else raw.decode('utf-8', errors='replace')
            return True, clean_logs
        else:
            msg = raw.decode('utf-8', errors='ignore')
            return False, f"Erreur Docker logs ({resp.status}): {msg}"
    except Exception as e:
        return False, str(e)
    finally:
        try:
            conn.close()
        except Exception:
            pass

@app.route('/api/containers/<container_id>/logs', methods=['GET'])
@check_auth
def container_logs(container_id):
    tail = request.args.get('tail', 300)
    try:
        tail = int(tail)
    except ValueError:
        tail = 300
    success, logs_or_err = docker_get_logs(container_id, tail)
    if success:
        return jsonify({'success': True, 'id': container_id, 'logs': logs_or_err})
    return jsonify({'success': False, 'error': logs_or_err}), 400


if __name__ == '__main__':
    # Initial measurement for cpu_percent baseline
    psutil.cpu_percent(interval=None)
    port = int(os.environ.get('PORT', 3550))
    debug_mode = os.environ.get('FLASK_DEBUG', '0') == '1'
    print(f"🚀 Starting DashMax Server on port {port} (Debug: {debug_mode})...")
    app.run(host='0.0.0.0', port=port, debug=debug_mode)
