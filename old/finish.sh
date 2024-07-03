if [ -d `pwd`/configged ]; then
    cp config/all.json configged/all.json
    rm config -rf
    rm configged -r
    ln -s /mnt/storage/taxi/config config
else
    echo "CONFIGGED DOES NOT EXIST. EXITING"
    exit 1
fi
