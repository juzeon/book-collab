interface Single {
    str?: string
}

let single = <Single>{
    str:' '
}
console.log(!!single.str)
