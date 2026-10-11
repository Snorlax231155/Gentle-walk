import socket
import select
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

class ProxyHandler(BaseHTTPRequestHandler):
    def do_CONNECT(self):
        host, port = self.path.split(':')
        port = int(port)
        try:
            # Force IPv4 resolution
            addr_info = socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)
            target_ip = addr_info[0][4][0]
            
            target_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            target_sock.settimeout(10)
            target_sock.connect((target_ip, port))
            target_sock.settimeout(None)

            self.send_response(200, "Connection Established")
            self.end_headers()

            sockets = [self.connection, target_sock]
            while True:
                r, _, _ = select.select(sockets, [], [], 60)
                if not r:
                    break
                for s in r:
                    other = target_sock if s is self.connection else self.connection
                    data = s.recv(8192)
                    if not data:
                        return
                    other.sendall(data)
        except Exception as e:
            self.send_error(502, f"Proxy error: {e}")
        finally:
            try:
                target_sock.close()
            except Exception:
                pass

def run():
    server = HTTPServer(('127.0.0.1', 8888), ProxyHandler)
    server.serve_forever()

if __name__ == '__main__':
    run()
