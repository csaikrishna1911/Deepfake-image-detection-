import requests

try:
    print("Testing /api/stats...")
    res_stats = requests.get("http://127.0.0.1:5000/api/stats")
    print(f"Stats Status: {res_stats.status_code}")
    print(f"Stats Response: {res_stats.json()}")
    
    print("\nTesting /api/history...")
    res_hist = requests.get("http://127.0.0.1:5000/api/history")
    print(f"History Status: {res_hist.status_code}")
    print(f"History Response: {res_hist.json()}")
except Exception as e:
    print(f"Error during testing: {e}")
