#!/bin/sh
echo start

#数字不足指定位数（默认为3），则在前面自动补0
fixNum()
{
    if [ -z $2 ];then
        niceLength=3
    else
        niceLength=$2
    fi

    numofchar=`expr "$1" : '.*'`  
    restNum=`expr $niceLength - $numofchar`
    rval=$1
    while [ $restNum -gt 0 ] ;do
        rval="0"$rval
        restNum=`expr $restNum - 1`
    done
    echo $rval
}

#define
#baseUrl="http://www.umei.cc/tags/Vicni.htm"
#http://www.umei.cc/tags/ligui.htm
baseUrl=" http://www.umei.cc/tags/BeautyLeg.htm"
destLeg="./blegbeauty/"

#todo
#上次down的地址
lastUrl="http://www.umei.cc/p/gaoqing/gangtai/20140421192950.htm"


dest="./log/"
#final gallery 所有角色图片url列表
destA="./log/aFinal.log"
#final single 单个角色图片地址规则 每个角色只存储一个文件路径
destB="./log/bFinal.log"

#get gallery
if [ -f $destB ] ; then
    echo "Read gallery\n"
else
    echo "Getting role list \n"
    gallery_key='class=title'
    curl -s ${baseUrl} | grep $gallery_key | iconv -f gbk -t utf-8 > $dest"a0"
    #<DIV class=title><A href=http://www.80517185.htm >xx</A></DIV>

    sed 's/.*href=\(.*.htm\).*/\1/' $dest"a0" > $destA

    echo "Got role list , then getting single role "
    #不知道grep为何匹配不到IMG_Show了
    every_key='class="img_box"'
    while read line ; do
        curl -s ${line} | grep $every_key | iconv -f gbk -t utf-8 > $dest"b0"
        #curl -s ${line} | grep "0000.jpg" > $dest"b0"
        #curl -s ${line} | grep $every_key > $dest"b0"
        #<div class="img_box"><a href=x.htm title='[B] x 2013.04.26 No.813 Vicni [93P]'><img class=IMG_show border=0 src=http://i8.umei.cc//img2012/2013/04/15/017BT813/0000.jpg alt='[b] x 2013.04.26 No.813 Vicni [93P]'></a></div>

        awk '-F["><"]' '{for(i=1;i<=NF;i++){if($i~/IMG_show/){print $i;break;}}}' $dest"b0" > $dest"b1"

        #format data to src period count
        #filter bad data TODO save bad data
        #replace fileName
        #append currentCount
        sed -e 's/.*src=\(.*.jpg\).*No.\([0-9]*\).*\[\([0-9]*\)P\].*/\1 \2 \3/' $dest"b1" | \
        awk '{if($1~/^http/){print $0}}' | \
        sed -e 's/[0-9]*.jpg//' | \
        sed 's/$/ C:0/' >> $destB

    done < $destA
    echo "Got single"
fi

#loop download
while read line ; do
    #获取单记录
    #urlRule $period $totalCount $count
    #按空格截断分别获取每个片段的值
    eachBaseUrl=`echo $line | awk '{print $1;}' `
    period=`echo ${line} | awk '{print $2;}'`
    totalCount=`echo ${line} | awk '{print $3;}'`
    currentCount=`echo ${line} | awk '{print $4;}' | sed 's/C://'`

    #echo $eachBaseUrl 
    #echo $period
    #echo $totalCount
    #echo $currentCount

    for((k=$currentCount;k<$totalCount;k++));do
        kFix=`fixNum $k 4`

        eachUrl="${eachBaseUrl}${kFix}.jpg"
        localUrl=${destLeg}"${period}/${kFix}.jpg"

        #eachUrl=`echo $eachUrl | sed 's/i7.umei.cc/61.146.178.181:8013/'`

        #ttp://61.146.178.120:8012/img2012/2013/08/01/012BT853/0060.jpg
        #ttp://i8.umei.cc//img2012/2013/04/15/017BT813/0000.jpg
        #curl http://61.146.178.181:8013/img2012/2013/09/24/018BT876/000.jpg -o ./xxyy/a.jpg --create-dirs
        ret_code=`curl -s -w %{http_code} -m 5000 -o $localUrl --create-dirs $eachUrl`
        echo "Period-"${period}"-"${k}" status code: "${ret_code}"\n"

        if [ $ret_code -eq 302 ] ; then
            echo "old url: "$eachUrl"\n"
            #jpg后面必须跟上.*，否则匹配处理的数据有错误 使用hexdump可以看到，另外sed中的分隔符也可以其他元字符如#
            eachUrl=`curl -s -I $eachUrl | grep 'Location' | sed 's#.*\(http.*.jpg\).*#\1#'`
            echo "new url: "$eachUrl"\n"

            ret_code=`curl -s -w %{http_code} -m 5000 -o $localUrl --create-dirs $eachUrl`
            echo "new status code: "${ret_code}"\n"
        fi

        sed -i '' "1 s/C:[0-9]*/C:${k}/" $destB
    done

    #delete row， -i 后面必须加空参数
    sed -i '' '1 d' $destB
    echo "Clear current role, got next role"

done < $destB

echo "All done"
rm $destB
exit
