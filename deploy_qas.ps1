$password = "@Tmd4738@"
$command = "cd /home/renomear/tnaocr && git pull origin main && docker compose up -d --build"
echo $password | ssh -p 22022 -o StrictHostKeyChecking=no renomear@renomear.tnadigital.com.br $command
