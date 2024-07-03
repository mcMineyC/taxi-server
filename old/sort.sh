cd /opt/taxi/server
mv config configged
mkdir config
cp configged/all.json config/

echo "Backed up config, autosorting"
echo
echo

python3 autosort.py

echo
echo "Done sorting.  Check file"