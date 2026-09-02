package com.sosmartlabs.momotabletpadres.utils.exception


/**
 * This result should exist, if not, thrown exception
 */
class ObjectDoesNotExistException() :
        Exception("Parse query result is empty, there is no local object")
