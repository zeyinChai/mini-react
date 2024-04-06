export default function(nativeEvent){
    const target = nativeEvent.target || nativeEvent.srcElement || window
    return target
}