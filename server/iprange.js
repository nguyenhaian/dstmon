var rangeCheck = require('range_check');

var iplist = '1.52.0.0-1.55.255.255,14.0.16.0-14.0.31.255,14.160.0.0-14.191.255.255,14.224.0.0-14.255.255.255,27.0.12.0-27.0.15.255,27.0.240.0-27.0.243.255,27.2.0.0-27.3.255.255,27.64.0.0-27.79.255.255,27.118.16.0-27.118.31.255,42.1.64.0-42.1.127.255,42.96.0.0-42.96.3.255,42.96.4.0-42.96.5.255,42.96.6.0-42.96.6.255,42.96.7.0-42.96.7.255,42.96.8.0-42.96.8.255,42.96.9.0-42.96.9.255,42.96.10.0-42.96.11.255,42.96.12.0-42.96.15.255,42.96.16.0-42.96.31.255,42.96.32.0-42.96.63.255,42.112.0.0-42.119.255.255,43.239.148.0-43.239.151.255,43.239.184.0-43.239.187.255,43.239.188.0-43.239.191.255,43.239.220.0-43.239.223.255,43.239.224.0-43.239.227.255,45.117.76.0-45.117.79.255,45.117.80.0-45.117.83.255,45.117.156.0-45.117.159.255,45.117.160.0-45.117.163.255,45.117.164.0-45.117.167.255,45.117.168.0-45.117.171.255,45.117.172.0-45.117.175.255,45.117.176.0-45.117.179.255,45.118.136.0-45.118.139.255,45.118.140.0-45.118.143.255,45.118.144.0-45.118.147.255,45.118.148.0-45.118.151.255,45.119.76.0-45.119.79.255,45.119.80.0-45.119.83.255,45.119.84.0-45.119.87.255,45.119.108.0-45.119.111.255,45.119.212.0-45.119.215.255,45.119.216.0-45.119.219.255,45.119.240.0-45.119.243.255,45.120.224.0-45.120.227.255,45.120.228.0-45.120.231.255,45.121.24.0-45.121.27.255,45.121.152.0-45.121.155.255,45.121.160.0-45.121.163.255,45.122.220.0-45.122.223.255,45.122.232.0-45.122.235.255,45.122.236.0-45.122.239.255,45.122.240.0-45.122.243.255,45.122.244.0-45.122.247.255,45.122.248.0-45.122.251.255,45.122.252.0-45.122.255.255,45.123.96.0-45.123.99.255,45.124.84.0-45.124.87.255,45.124.88.0-45.124.91.255,45.124.92.0-45.124.95.255,45.125.200.0-45.125.203.255,45.125.204.0-45.125.207.255,45.125.208.0-45.125.211.255,45.125.236.0-45.125.239.255,45.126.92.0-45.126.95.255,45.126.96.0-45.126.99.255,45.127.252.0-45.127.255.255,45.251.112.0-45.251.115.255,45.252.240.0-45.252.243.255,45.252.244.0-45.252.247.255,45.252.248.0-45.252.251.255,45.254.32.0-45.254.35.255,49.156.52.0-49.156.55.255,49.213.64.0-49.213.127.255,49.236.208.0-49.236.211.255,49.246.128.0-49.246.191.255,49.246.192.0-49.246.223.255,58.84.0.0-58.84.3.255,58.186.0.0-58.187.255.255,59.153.212.0-59.153.215.255,59.153.216.0-59.153.219.255,59.153.220.0-59.153.223.255,59.153.224.0-59.153.227.255,59.153.228.0-59.153.231.255,59.153.232.0-59.153.235.255,59.153.236.0-59.153.239.255,59.153.240.0-59.153.243.255,59.153.244.0-59.153.247.255,59.153.248.0-59.153.251.255,59.153.252.0-59.153.255.255,61.11.224.0-61.11.255.255,61.14.232.0-61.14.235.255,61.14.236.0-61.14.239.255,61.28.224.0-61.28.255.255,101.53.0.0-101.53.63.255,101.96.12.0-101.96.15.255,101.96.64.0-101.96.127.255,101.99.0.0-101.99.63.255,103.1.200.0-103.1.203.255,103.1.208.0-103.1.211.255,103.1.236.0-103.1.239.255,103.2.220.0-103.2.223.255,103.2.224.0-103.2.227.255,103.2.228.0-103.2.231.255,103.3.244.0-103.3.247.255,103.3.248.0-103.3.251.255,103.3.252.0-103.3.255.255,103.4.128.0-103.4.131.255,103.5.30.0-103.5.31.255,103.5.204.0-103.5.207.255,103.5.208.0-103.5.211.255,103.7.36.0-103.7.39.255,103.7.40.0-103.7.43.255,103.7.172.0-103.7.172.255,103.7.174.0-103.7.175.255,103.7.177.0-103.7.177.255,103.7.196.0-103.7.196.255,103.8.13.0-103.8.13.255,103.9.0.0-103.9.3.255,103.9.4.0-103.9.7.255,103.9.76.0-103.9.79.255,103.9.80.0-103.9.83.255,103.9.84.0-103.9.87.255,103.9.156.0-103.9.159.255,103.9.196.0-103.9.199.255,103.9.200.0-103.9.203.255,103.9.204.0-103.9.207.255,103.9.208.0-103.9.211.255,103.9.212.0-103.9.215.255,103.10.44.0-103.10.47.255,103.10.88.0-103.10.91.255,103.10.212.0-103.10.215.255,103.11.172.0-103.11.175.255,103.12.104.0-103.12.107.255,103.13.76.0-103.13.79.255,103.15.48.0-103.15.51.255,103.16.0.0-103.16.3.255,103.17.88.0-103.17.91.255,103.17.236.0-103.17.239.255,103.18.4.0-103.18.7.255,103.18.176.0-103.18.179.255,103.19.96.0-103.19.99.255,103.19.164.0-103.19.167.255,103.19.220.0-103.19.223.255,103.20.144.0-103.20.147.255,103.20.148.0-103.20.151.255,103.21.120.0-103.21.123.255,103.21.148.0-103.21.151.255,103.23.144.0-103.23.147.255,103.23.156.0-103.23.159.255,103.24.244.0-103.24.247.255,103.26.252.0-103.26.255.255,103.27.60.0-103.27.63.255,103.27.64.0-103.27.67.255,103.27.236.0-103.27.239.255,103.28.32.0-103.28.35.255,103.28.36.0-103.28.39.255,103.28.136.0-103.28.139.255,103.28.172.0-103.28.175.255,103.30.36.0-103.30.39.255,103.31.120.0-103.31.123.255,103.31.124.0-103.31.127.255,103.35.64.0-103.35.67.255,103.37.28.0-103.37.31.255,103.37.32.0-103.37.35.255,103.38.136.0-103.38.139.255,103.39.92.0-103.39.95.255,103.39.96.0-103.39.99.255,103.42.56.0-103.42.59.255,103.45.228.0-103.45.231.255,103.45.232.0-103.45.235.255,103.45.236.0-103.45.239.255,103.47.192.0-103.47.195.255,103.48.76.0-103.48.79.255,103.48.80.0-103.48.83.255,103.48.84.0-103.48.87.255,103.48.188.0-103.48.191.255,103.48.192.0-103.48.195.255,103.52.92.0-103.52.95.255,103.53.88.0-103.53.91.255,103.53.168.0-103.53.171.255,103.53.228.0-103.53.231.255,103.53.252.0-103.53.255.255,103.54.248.0-103.54.251.255,103.54.252.0-103.54.255.255,103.56.156.0-103.56.159.255,103.56.160.0-103.56.163.255,103.56.164.0-103.56.167.255,103.56.168.0-103.56.171.255,103.57.104.0-103.57.107.255,103.57.112.0-103.57.115.255,103.57.208.0-103.57.211.255,103.57.220.0-103.57.223.255,103.60.16.0-103.60.19.255,103.61.44.0-103.61.47.255,103.61.48.0-103.61.51.255,103.62.8.0-103.62.11.255,103.63.104.0-103.63.107.255,103.63.108.0-103.63.111.255,103.63.112.0-103.63.115.255,103.63.116.0-103.63.119.255,103.63.120.0-103.63.123.255,103.63.212.0-103.63.215.255,103.66.152.0-103.66.155.255,103.68.68.0-103.68.71.255,103.68.72.0-103.68.75.255,103.68.76.0-103.68.79.255,103.68.80.0-103.68.83.255,103.68.240.0-103.68.243.255,103.68.244.0-103.68.247.255,103.68.248.0-103.68.251.255,103.68.252.0-103.68.255.255,103.69.188.0-103.69.191.255,103.69.192.0-103.69.195.255,103.70.28.0-103.70.31.255,103.71.180.0-103.71.183.255,103.71.184.0-103.71.187.255,103.72.96.0-103.72.99.255,103.74.100.0-103.74.103.255,103.74.104.0-103.74.107.255,103.74.112.0-103.74.115.255,103.74.116.0-103.74.119.255,103.74.120.0-103.74.123.255,103.75.176.0-103.75.179.255,103.75.180.0-103.75.183.255,103.75.184.0-103.75.187.255,103.192.236.0-103.192.239.255,103.194.188.0-103.194.191.255,103.195.236.0-103.195.239.255,103.195.240.0-103.195.243.255,103.196.16.0-103.196.19.255,103.196.236.0-103.196.239.255,103.196.244.0-103.196.247.255,103.196.248.0-103.196.251.255,103.199.4.0-103.199.7.255,103.199.8.0-103.199.11.255,103.199.12.0-103.199.15.255,103.199.16.0-103.199.19.255,103.199.20.0-103.199.23.255,103.199.24.0-103.199.27.255,103.199.28.0-103.199.31.255,103.199.32.0-103.199.35.255,103.199.36.0-103.199.39.255,103.199.40.0-103.199.43.255,103.199.44.0-103.199.47.255,103.199.48.0-103.199.51.255,103.199.52.0-103.199.55.255,103.199.56.0-103.199.59.255,103.199.60.0-103.199.63.255,103.199.64.0-103.199.67.255,103.199.68.0-103.199.71.255,103.199.72.0-103.199.75.255,103.199.76.0-103.199.79.255,103.200.20.0-103.200.23.255,103.200.24.0-103.200.27.255,103.200.60.0-103.200.63.255,103.200.120.0-103.200.123.255,103.205.96.0-103.205.99.255,103.205.100.0-103.205.103.255,103.205.104.0-103.205.107.255,103.206.212.0-103.206.215.255,103.206.216.0-103.206.219.255,103.207.32.0-103.207.35.255,103.207.36.0-103.207.39.255,103.211.212.0-103.211.215.255,103.213.122.0-103.213.123.255,103.214.8.0-103.214.11.255,103.216.72.0-103.216.75.255,103.216.112.0-103.216.115.255,103.216.116.0-103.216.119.255,103.216.120.0-103.216.123.255,103.216.124.0-103.216.127.255,103.216.128.0-103.216.131.255,103.219.180.0-103.219.183.255,103.220.68.0-103.220.71.255,103.220.84.0-103.220.87.255,103.221.86.0-103.221.86.255,103.221.212.0-103.221.215.255,103.221.216.0-103.221.219.255,103.221.220.0-103.221.223.255,103.221.224.0-103.221.227.255,103.221.228.0-103.221.231.255,103.223.4.0-103.223.7.255,103.224.168.0-103.224.171.255,103.225.236.0-103.225.239.255,103.226.108.0-103.226.111.255,103.226.248.0-103.226.251.255,103.227.112.0-103.227.115.255,103.227.216.0-103.227.219.255,103.228.20.0-103.228.23.255,103.229.40.0-103.229.43.255,103.229.192.0-103.229.195.255,103.231.148.0-103.231.151.255,103.231.188.0-103.231.191.255,103.232.52.0-103.232.55.255,103.232.56.0-103.232.59.255,103.232.60.0-103.232.63.255,103.232.120.0-103.232.123.255,103.233.48.0-103.233.51.255,103.234.36.0-103.234.39.255,103.234.88.0-103.234.91.255,103.235.208.0-103.235.211.255,103.235.212.0-103.235.215.255,103.237.60.0-103.237.63.255,103.237.64.0-103.237.67.255,103.237.96.0-103.237.99.255,103.237.144.0-103.237.147.255,103.237.148.0-103.237.151.255,103.238.68.0-103.238.71.255,103.238.72.0-103.238.75.255,103.238.76.0-103.238.79.255,103.238.80.0-103.238.83.255,103.238.208.0-103.238.211.255,103.238.212.0-103.238.215.255,103.239.32.0-103.239.35.255,103.239.116.0-103.239.119.255,103.239.120.0-103.239.123.255,103.241.248.0-103.241.251.255,103.242.52.0-103.242.55.255,103.243.104.0-103.243.107.255,103.243.216.0-103.243.219.255,103.244.136.0-103.244.139.255,103.245.148.0-103.245.151.255,103.245.244.0-103.245.247.255,103.245.248.0-103.245.251.255,103.245.252.0-103.245.255.255,103.246.104.0-103.246.104.255,103.246.220.0-103.246.223.255,103.248.160.0-103.248.163.255,103.248.164.0-103.248.167.255,103.249.20.0-103.249.23.255,103.249.100.0-103.249.103.255,103.250.24.0-103.250.27.255,103.252.0.0-103.252.3.255,103.252.252.0-103.252.255.255,103.253.88.0-103.253.91.255,103.254.12.0-103.254.15.255,103.254.16.0-103.254.19.255,103.254.40.0-103.254.43.255,103.254.216.0-103.254.219.255,103.255.84.0-103.255.87.255,103.255.236.0-103.255.239.255,110.35.64.0-110.35.71.255,110.35.72.0-110.35.79.255,110.44.184.0-110.44.191.255,111.65.240.0-111.65.255.255,111.91.232.0-111.91.235.255,112.72.64.0-112.72.127.255,112.78.0.0-112.78.15.255,112.109.88.0-112.109.95.255,112.137.128.0-112.137.143.255,112.197.0.0-112.197.255.255,112.213.80.0-112.213.95.255,113.20.96.0-113.20.127.255,113.22.0.0-113.22.255.255,113.23.0.0-113.23.127.255,113.52.32.0-113.52.63.255,113.61.108.0-113.61.111.255,113.160.0.0-113.191.255.255,115.72.0.0-115.79.255.255,115.84.176.0-115.84.183.255,115.146.120.0-115.146.127.255,115.165.160.0-115.165.167.255,116.68.128.0-116.68.135.255,116.96.0.0-116.111.255.255,116.118.0.0-116.118.127.255,116.193.64.0-116.193.79.255,116.212.32.0-116.212.63.255,117.0.0.0-117.7.255.255,117.103.192.0-117.103.255.255,117.122.0.0-117.122.127.255,118.68.0.0-118.71.255.255,118.102.0.0-118.102.7.255,118.107.64.0-118.107.127.255,119.15.160.0-119.15.191.255,119.17.192.0-119.17.255.255,119.18.128.0-119.18.143.255,119.18.184.0-119.18.191.255,119.82.128.0-119.82.143.255,120.50.184.0-120.50.191.255,120.72.80.0-120.72.87.255,120.72.96.0-120.72.127.255,120.138.64.0-120.138.79.255,121.50.172.0-121.50.175.255,122.102.112.0-122.102.115.255,122.129.0.0-122.129.63.255,122.201.8.0-122.201.15.255,123.16.0.0-123.31.255.255,124.157.0.0-124.157.63.255,124.158.0.0-124.158.15.255,125.58.0.0-125.58.63.255,125.212.128.0-125.212.255.255,125.214.0.0-125.214.63.255,125.234.0.0-125.235.255.255,125.253.112.0-125.253.127.255,137.59.24.0-137.59.27.255,137.59.28.0-137.59.31.255,137.59.32.0-137.59.35.255,137.59.36.0-137.59.39.255,137.59.40.0-137.59.43.255,137.59.44.0-137.59.47.255,137.59.104.0-137.59.107.255,137.59.116.0-137.59.119.255,144.48.20.0-144.48.23.255,144.48.24.0-144.48.27.255,146.196.64.0-146.196.67.255,150.95.16.0-150.95.19.255,157.119.244.0-157.119.247.255,157.119.248.0-157.119.251.255,163.44.192.0-163.44.195.255,163.44.200.0-163.44.200.255,163.44.204.0-163.44.207.255,171.224.0.0-171.255.255.255,175.103.64.0-175.103.127.255,175.106.0.0-175.106.3.255,180.93.0.0-180.93.255.255,180.148.0.0-180.148.7.255,180.148.128.0-180.148.143.255,180.214.236.0-180.214.239.255,182.161.80.0-182.161.95.255,182.236.112.0-182.236.115.255,182.237.20.0-182.237.23.255,183.80.0.0-183.80.255.255,183.81.0.0-183.81.127.255,183.90.160.0-183.90.167.255,183.91.0.0-183.91.31.255,183.91.160.0-183.91.191.255,202.0.79.0-202.0.79.255,202.4.168.0-202.4.168.255,202.4.176.0-202.4.176.255,202.6.2.0-202.6.2.255,202.6.96.0-202.6.97.255,202.9.79.0-202.9.79.255,202.9.80.0-202.9.80.255,202.9.84.0-202.9.84.255,202.37.86.0-202.37.87.255,202.43.108.0-202.43.111.255,202.44.137.0-202.44.137.255,202.47.87.0-202.47.87.255,202.47.142.0-202.47.142.255,202.52.39.0-202.52.39.255,202.55.132.0-202.55.135.255,202.56.57.0-202.56.57.255,202.58.245.0-202.58.245.255,202.59.238.0-202.59.239.255,202.59.252.0-202.59.253.255,202.60.104.0-202.60.111.255,202.74.56.0-202.74.56.255,202.74.58.0-202.74.59.255,202.78.224.0-202.78.231.255,202.79.232.0-202.79.239.255,202.87.212.0-202.87.215.255,202.92.4.0-202.92.7.255,202.93.156.0-202.93.159.255,202.94.82.0-202.94.82.255,202.94.88.0-202.94.89.255,202.124.204.0-202.124.204.255,202.130.36.0-202.130.37.255,202.134.16.0-202.134.23.255,202.134.54.0-202.134.54.255,202.143.108.0-202.143.111.255,202.151.160.0-202.151.175.255,202.158.244.0-202.158.247.255,202.160.124.0-202.160.125.255,202.172.4.0-202.172.5.255,202.191.56.0-202.191.59.255,203.8.127.0-203.8.127.255,203.8.172.0-203.8.172.255,203.34.144.0-203.34.144.255,203.77.178.0-203.77.178.255,203.79.28.0-203.79.28.255,203.89.140.0-203.89.143.255,203.99.248.0-203.99.251.255,203.113.128.0-203.113.159.255,203.113.160.0-203.113.191.255,203.119.8.0-203.119.11.255,203.119.36.0-203.119.39.255,203.119.44.0-203.119.47.255,203.119.58.0-203.119.59.255,203.119.60.0-203.119.63.255,203.119.64.0-203.119.71.255,203.119.72.0-203.119.75.255,203.128.240.0-203.128.247.255,203.160.0.0-203.160.1.255,203.160.96.0-203.160.103.255,203.160.132.0-203.160.135.255,203.161.178.0-203.161.178.255,203.162.0.0-203.162.7.255,203.162.8.0-203.162.15.255,203.162.16.0-203.162.31.255,203.162.32.0-203.162.63.255,203.162.64.0-203.162.127.255,203.162.128.0-203.162.143.255,203.162.144.0-203.162.159.255,203.162.160.0-203.162.191.255,203.162.192.0-203.162.255.255,203.163.128.0-203.163.191.255,203.167.8.0-203.167.11.255,203.167.12.0-203.167.15.255,203.170.26.0-203.170.27.255,203.171.16.0-203.171.31.255,203.176.160.0-203.176.167.255,203.189.28.0-203.189.31.255,203.190.160.0-203.190.175.255,203.191.8.0-203.191.15.255,203.191.48.0-203.191.55.255,203.195.0.0-203.195.63.255,203.196.24.0-203.196.27.255,203.201.56.0-203.201.59.255,203.205.0.0-203.205.63.255,203.209.180.0-203.209.183.255,203.210.128.0-203.210.191.255,203.210.192.0-203.210.255.255,210.2.64.0-210.2.127.255,210.86.224.0-210.86.239.255,210.211.96.0-210.211.127.255,210.245.0.0-210.245.31.255,210.245.32.0-210.245.63.255,210.245.64.0-210.245.127.255,218.100.10.0-218.100.10.255,218.100.14.0-218.100.14.255,218.100.60.0-218.100.60.255,220.231.64.0-220.231.127.255,221.121.0.0-221.121.63.255,221.132.0.0-221.132.63.255,221.133.0.0-221.133.31.255,222.252.0.0-222.255.255.255,223.27.104.0-223.27.111.255';
iplist = iplist.split(',');
for (var i = iplist.length - 1; i >= 0; i--) {
    iplist[i] = iplist[i].split('-');
};

// var ipExcepts = '192.168.1.1;';
var ipExcepts = '';


// http://stackoverflow.com/questions/20303690/match-ip-with-a-range-stored-in-an-array

/**
 * Checks if an IP address is within range of 2 other IP addresses
 * @param  {String}  ip         IP to validate
 * @param  {String}  lowerBound The lower bound of the range
 * @param  {String}  upperBound The upper bound of the range
 * @return {Boolean}            True or false
 */
function isWithinRange(ip, lowerBound, upperBound) {
    // Save us some processing time if the IP equals either the lower bound or 
    // upper bound
    if (ip === lowerBound || ip === upperBound) return true;

    // Split IPs into arrays for iterations below. Use same variables since 
    // we won't need them as strings anymore and because someone will complain 
    // about wasting memory.
    ip = ip.split('.');
    lowerBound = lowerBound.split('.');
    upperBound = upperBound.split('.');

    // A nice, classic for loop iterating over each segment in the IP address
    for (var i = 0; i < 4; i++) {
        // We need those segments to be converted to ints or our comparisons 
        // will not work!
        ip[i] = parseInt(ip[i]);
        lowerBound[i] = parseInt(lowerBound[i]);
        upperBound[i] = parseInt(upperBound[i]);

        // If this is our first iteration, just make sure the first segment 
        // falls within or equal to the range values
        if (i === 0) {
            if (ip[i] < lowerBound[i] || ip[i] > upperBound[i]) {
                return false;
            }
        }

        // If the last segment was equal to the corresponding lower bound 
        // segment, make sure that the current segment is greater
        if (ip[i - 1] === lowerBound[i - 1]) {
            if (ip[i] < lowerBound[i]) return false;
        }

        // If the last segment was equal to the corresponding upper bound 
        // segment, make sure that the current segment is less than
        if (ip[i - 1] === upperBound[i - 1]) {
            if (ip[i] > upperBound[i]) return false;
        }
    }

    return true;
}

exports.inVietnam = (ip) => {
    // biến ip từ dạng v6 -> v4
    ip = rangeCheck.storeIP(ip);

    // except một số IP nhất định
    if(ipExcepts.indexOf(ip) !== -1){
        // tìm thấy ip trong chuỗi except
        // những ip này đc coi là ngoài VN, để thuận lợi cho việc test.
        return false;
    }

    // kiểm tra IP có thuộc range VN hay ko
    for (var i = iplist.length - 1; i >= 0; i--) {
        if (isWithinRange(ip, iplist[i][0], iplist[i][1])) {
            return true;
        }
    };
    return false;
}
